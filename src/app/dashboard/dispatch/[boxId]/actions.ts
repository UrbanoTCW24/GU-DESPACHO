'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'


export async function getBoxDetails(boxId: string) {
    const supabase = await createClient()
    const { data: box, error } = await supabase
        .from('boxes')
        .select('*, models(*, brands(*)), users(email, name)')
        .eq('id', boxId)
        .single()

    if (error || !box) return null

    // Fetch items in the box
    const { data: items } = await supabase
        .from('equipment')
        .select('*, users(email, name)')
        .eq('box_id', boxId)
        .order('scanned_at', { ascending: false })

    // Validar series contra SAP (Batch Read-Time)
    const validSeriesSet = new Set<string>()
    if (items && items.length > 0) {
        // Collect all series values
        const allSeries: string[] = []
        items.forEach((item: any) => {
            if (item.series_data) {
                Object.values(item.series_data).forEach((val: any) => {
                    if (val && String(val).length > 1) {
                        allSeries.push(String(val).trim())
                    }
                })
            }
        })

        // Chunking for safety (Supabase/Postgres limits on IN clause)
        const uniqueSeries = Array.from(new Set(allSeries))
        const CHUNK_SIZE = 500

        for (let i = 0; i < uniqueSeries.length; i += CHUNK_SIZE) {
            const chunk = uniqueSeries.slice(i, i + CHUNK_SIZE)
            const { data: found } = await supabase
                .from('sap_data')
                .select('series')
                .in('series', chunk)

            found?.forEach(r => validSeriesSet.add(String(r.series).trim()))
        }
    }

    return { ...box, items: items || [], validSeries: Array.from(validSeriesSet) }
}

// --- Helper Functions ---

type SeriesData = Record<string, string>

// --- Helper Functions ---

function validateLocalDuplicates(seriesData: SeriesData): string | null {
    const values = Object.values(seriesData).filter(v => v && String(v).length > 2)
    const uniqueValues = new Set(values)
    if (uniqueValues.size !== values.length) {
        return 'Las series ingresadas no pueden ser iguales entre sí.'
    }
    return null
}

async function validateGlobalDuplicates(supabase: SupabaseClient, seriesData: SeriesData): Promise<string | null> {
    for (const [key, value] of Object.entries(seriesData)) {
        if (!value || String(value).length < 3) continue

        const { data: existing } = await supabase
            .from('equipment')
            .select('id, box_id, boxes(box_number), users(email)')
            .contains('series_data', { [key]: value })
            .limit(1)
            .maybeSingle()

        if (existing) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const boxes: any = existing.boxes
            const boxNum = Array.isArray(boxes) ? boxes[0]?.box_number : boxes?.box_number
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const owner = (existing as any).users?.email || 'otro usuario'

            return `La serie ${value} ya existe en la caja ${boxNum} (Usr: ${owner})`
        }
    }
    return null
}

type ValidationResult = {
    status: 'valid' | 'warning' | 'error'
    message?: string
    material?: string
    matchedSnValue?: string
    matchedPosition?: string
    validationType?: 'primary' | 'secondary' | 'none'
    isSapValidated: boolean
}

async function checkSapValidation(supabase: SupabaseClient, seriesData: SeriesData): Promise<ValidationResult> {
    // Defines Priority Order (Support both SN-X and S-X formats)
    const priorityOrder = ['SN-1', 'S-1', 'SN-2', 'S-2', 'SN-3', 'S-3', 'SN-4', 'S-4']

    // Check in order: The FIRST one that matches SAP wins.
    for (const key of priorityOrder) {
        let value = seriesData[key]
        if (!value || value.length < 3) continue

        // Normalize: Upper case and remove ALL whitespace (including internal spaces if any)
        value = String(value).toUpperCase().replace(/\s+/g, '')

        // Query SAP DATA
        const { data: sapRecord } = await supabase
            .from('sap_data')
            .select('series, material, status')
            .eq('series', value)
            .limit(1)
            .maybeSingle()

        if (sapRecord) {
            // Match Found! (Any key is valid)
            return {
                status: 'valid',
                material: sapRecord.material,
                matchedSnValue: value,
                matchedPosition: key, // Keep track of which key matched
                validationType: 'primary', // Treat all as primary/valid for UI
                isSapValidated: true
            }
        }
    }

    // Case 3: No Match Found — save as non-validated (don't block)
    const searchedKeys = priorityOrder.filter(k => seriesData[k]).map(k => `${k}: ${seriesData[k]}`).join(' / ')
    return {
        status: 'warning',
        message: `Serie no encontrada en SAP (${searchedKeys || 'sin series válidas'})`,
        isSapValidated: false,
        validationType: 'none'
    }
}

async function registerSeriesGlobally(supabase: SupabaseClient, seriesData: SeriesData, equipmentId: string, boxId: string) {
    const validValues = Object.values(seriesData).filter((v: any) => v && String(v).length > 2)

    for (const val of validValues) {
        const { error: registryError } = await supabase
            .from('global_series_registry')
            .insert({
                series: val,
                equipment_id: equipmentId,
                box_id: boxId
            })

        if (registryError) {
            // Rollback: Delete the equipment we just created
            await supabase.from('equipment').delete().eq('id', equipmentId)
            return `Error registrando serie ${val}: ${registryError.message}`
        }
    }
    return null
}

// --- Main Actions ---

export async function addEquipment(boxId: string, seriesData: SeriesData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Local Validation
    const localError = validateLocalDuplicates(seriesData)
    if (localError) return { error: localError }

    // 2. Global DB Validation (Check if exists in other boxes)
    const globalError = await validateGlobalDuplicates(supabase, seriesData)
    if (globalError) return { error: globalError }

    // 3. SAP Validation — blocking: if not found in SAP, reject the scan
    const sapResult = await checkSapValidation(supabase, seriesData)

    if (sapResult.status === 'warning') {
        // Not found in SAP — block but show yellow warning (not red error)
        return { sapWarning: sapResult.message }
    }

    // 4. Insert Item
    const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .insert({
            box_id: boxId,
            series_data: seriesData,
            scanned_by: user.id,
            is_sap_validated: sapResult.isSapValidated,
            material: sapResult.material,
            matched_sn_value: sapResult.matchedSnValue,
            matched_position: sapResult.matchedPosition,
            validation_type: sapResult.validationType
        })
        .select()
        .single()

    if (equipmentError) return { error: equipmentError.message }

    // 5. Register in Global Registry 
    const registryError = await registerSeriesGlobally(supabase, seriesData, equipmentData.id, boxId)
    if (registryError) return { error: registryError }

    revalidatePath(`/dashboard/dispatch/${boxId}`)

    // Return success with extra info for UI
    return {
        success: true,
        isSapValidated: sapResult.isSapValidated,
        matchedPosition: sapResult.matchedPosition
    }
}

export async function deleteEquipment(itemId: string, boxId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', itemId)

    if (error) return { error: error.message }
    revalidatePath(`/dashboard/dispatch/${boxId}`)
    return { success: true }
}

export async function closeBox(boxId: string) {
    const supabase = await createClient()

    // Optional: Check if box has items?
    // const { count } = await supabase.from('equipment').select('*', { count: 'exact', head: true }).eq('box_id', boxId)

    const { error } = await supabase
        .from('boxes')
        .update({
            status: 'closed',
            closed_at: new Date().toISOString()
        })
        .eq('id', boxId)

    if (error) return { error: error.message }
    revalidatePath(`/dashboard/dispatch`)
    return { success: true }
}
