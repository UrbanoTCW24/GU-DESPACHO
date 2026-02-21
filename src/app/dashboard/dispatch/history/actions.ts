'use server'

import { createClient } from '@/utils/supabase/server'

export async function getDispatches(page = 1, limit = 20, search = '') {
    const supabase = await createClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
        .from('dispatches')
        .select(`
            *,
            users(name, email),
            boxes(count)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

    if (search) {
        query = query.ilike('sap_exit_id', `%${search}%`)
    }

    const { data, count, error } = await query.range(from, to)

    if (error) {
        console.error('Error fetching dispatches:', error)
        return { data: [], count: 0 }
    }

    return { data, count: count || 0 }
}

export async function getDispatchReportData(dispatchId: string) {
    const supabase = await createClient()

    // Fetch dispatch details and related boxes/equipment
    // We need: SAP ID, Box Number, Model, Brand, Material, Serial Numbers, User
    const { data: dispatch, error } = await supabase
        .from('dispatches')
        .select(`
            sap_exit_id,
            created_at,
            type,
            notes,
            users(name, email),
            boxes(
                box_number,
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
        .eq('id', dispatchId)
        .single()

    if (error || !dispatch) {
        console.error('Error fetching dispatch report:', error)
        return null
    }

    // Flatten data
    const rows: any[] = []

    dispatch.boxes.forEach((box: any) => {
        box.equipment.forEach((eq: any) => {
            const seriesValues = Object.values(eq.series_data || {}) as string[]
            const primarySeries = seriesValues[0] || '-'
            const additionalSeries = seriesValues.slice(1).join(', ')

            rows.push({
                'ID Salida SAP': dispatch.sap_exit_id,
                'Fecha Despacho': new Date(dispatch.created_at).toLocaleString('es-MX'),
                'Tipo Despacho': dispatch.type,
                'Caja': box.box_number,
                'Marca': box.models?.brands?.name,
                'Modelo': box.models?.name,
                'Material': eq.material,
                'Serie Principal': primarySeries,
                'Series Adicionales': additionalSeries,
                'Usuario Escaneo': eq.users?.name || eq.users?.email,
                'Estado': eq.is_sap_validated ? 'VALIDADO' : 'MANUAL'
            })
        })
    })

    return rows
}
