'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── READ ────────────────────────────────────────────────────────────────────

export async function getActivePallets() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('pallets')
        .select(`
            *,
            users(name, email),
            boxes(
                id, box_number, total_items, status,
                models(name, brands(name)),
                users(name, email),
                equipment(count)
            )
        `)
        .is('dispatch_id', null)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getActivePallets error:', error)
        return []
    }
    return data || []
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createPallet(name: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    // Auto-name if empty
    const palletName = name.trim() || await generatePalletName(supabase)

    const { data, error } = await supabase
        .from('pallets')
        .insert({ name: palletName, created_by: user.id })
        .select()
        .single()

    if (error) return { error: error.message }
    revalidatePath('/dashboard/shipments')
    return { data }
}

async function generatePalletName(supabase: Awaited<ReturnType<typeof import('@/utils/supabase/server').createClient>>) {
    const { count } = await supabase
        .from('pallets')
        .select('*', { count: 'exact', head: true })
    const num = String((count || 0) + 1).padStart(3, '0')
    return `TARIMA-${num}`
}

// ─── BOX ↔ PALLET ─────────────────────────────────────────────────────────────

export async function addBoxToPallet(palletId: string, boxId: string) {
    const supabase = await createClient()

    // Verify box is not already dispatched
    const { data: box } = await supabase
        .from('boxes')
        .select('dispatch_id, pallet_id, box_number')
        .eq('id', boxId)
        .single()

    if (!box) return { error: 'Caja no encontrada' }
    if (box.dispatch_id) return { error: 'La caja ya fue despachada' }
    if (box.pallet_id && box.pallet_id !== palletId) return { error: `La caja ya está en otra tarima` }

    const { error } = await supabase
        .from('boxes')
        .update({ pallet_id: palletId })
        .eq('id', boxId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/shipments')
    return { success: true }
}

export async function removeBoxFromPallet(boxId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('boxes')
        .update({ pallet_id: null })
        .eq('id', boxId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/shipments')
    return { success: true }
}

export async function deletePallet(palletId: string) {
    const supabase = await createClient()
    // First detach all boxes
    await supabase.from('boxes').update({ pallet_id: null }).eq('pallet_id', palletId)
    // Then delete the pallet
    const { error } = await supabase.from('pallets').delete().eq('id', palletId)
    if (error) return { error: error.message }
    revalidatePath('/dashboard/shipments')
    return { success: true }
}

// ─── DISPATCH ──────────────────────────────────────────────────────────────────

export async function dispatchPallets(
    palletIds: string[],
    sapExitId: string,
    notes?: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }
    if (!sapExitId.trim()) return { error: 'Se requiere ID de Salida SAP' }

    const results = []
    const now = new Date().toISOString()

    for (const palletId of palletIds) {
        // 1. Get pallet boxes
        const { data: boxes } = await supabase
            .from('boxes')
            .select('id')
            .eq('pallet_id', palletId)
            .is('dispatch_id', null)

        if (!boxes || boxes.length === 0) {
            results.push({ palletId, error: 'Tarima sin cajas' })
            continue
        }

        // 2. Create dispatch record for this pallet
        const { data: dispatch, error: dErr } = await supabase
            .from('dispatches')
            .insert({
                sap_exit_id: sapExitId.trim(),
                type: 'PALLET',
                pallet_id: palletId,
                created_by: user.id,
                notes: notes || null,
            })
            .select()
            .single()

        if (dErr || !dispatch) {
            results.push({ palletId, error: dErr?.message || 'Error al crear despacho' })
            continue
        }

        // 3. Update boxes with dispatch_id AND mark as dispatched
        const boxIds = boxes.map(b => b.id)
        await supabase
            .from('boxes')
            .update({ dispatch_id: dispatch.id, status: 'dispatched' })
            .in('id', boxIds)

        // 4. Mark pallet as dispatched
        await supabase
            .from('pallets')
            .update({
                dispatch_id: dispatch.id,
                sap_exit_id: sapExitId.trim(),
                dispatched_at: now,
            })
            .eq('id', palletId)

        results.push({ palletId, dispatchId: dispatch.id, success: true })
    }

    revalidatePath('/dashboard/shipments')
    return { results }
}

// ─── REPORT ───────────────────────────────────────────────────────────────────

export async function getPalletReportData(palletId: string) {
    const supabase = await createClient()

    const { data: pallet, error } = await supabase
        .from('pallets')
        .select(`
            name,
            sap_exit_id,
            dispatched_at,
            dispatch_id,
            boxes(
                box_number,
                total_items,
                models(name, brands(name)),
                users(name, email),
                equipment(
                    material,
                    scanned_at,
                    series_data,
                    is_sap_validated,
                    users(name, email)
                )
            )
        `)
        .eq('id', palletId)
        .single()

    if (error || !pallet) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pallet.boxes?.forEach((box: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        box.equipment?.forEach((eq: any) => {
            const seriesValues = Object.values(eq.series_data || {}) as string[]
            const primarySeries = seriesValues[0] || '-'
            const additionalSeries = seriesValues.slice(1).join(', ')

            rows.push({
                'Tarima': pallet.name,
                'ID Salida SAP': pallet.sap_exit_id || 'PENDIENTE',
                'Caja': box.box_number,
                'Marca': box.models?.brands?.name || '-',
                'Modelo': box.models?.name || '-',
                'Material': eq.material || '-',
                'Serie Principal': primarySeries,
                'Series Adicionales': additionalSeries || '-',
                'Usuario Escaneo': eq.users?.name || eq.users?.email || '-',
                'Estado SAP': eq.is_sap_validated ? 'VALIDADO' : 'MANUAL',
                'Fecha Despacho': pallet.dispatched_at
                    ? new Date(pallet.dispatched_at).toLocaleString('es-MX')
                    : 'NO DESPACHADO',
            })
        })
    })

    return { rows, palletName: pallet.name, sapExitId: pallet.sap_exit_id }
}
