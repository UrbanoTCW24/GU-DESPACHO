'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { read, utils } from 'xlsx'

export async function uploadSAPData(formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File

    if (!file) {
        return { error: 'No file uploaded' }
    }

    const buffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(buffer)

    let records: any[] = []

    // Determine file type or just try parsing with xlsx which handles CSV too often, 
    // but explicit CSV handling is sometimes safer for simple text.
    // Let's use xlsx for everything if possible, or check extension.
    // xlsx.read works with buffers and auto-detects.

    try {
        const workbook = read(fileBuffer, { type: 'buffer' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Read as array of arrays — most reliable for any Excel/CSV file
        const jsonData = utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null })

        console.log(`[SAP Upload] Total rows in file (including header): ${jsonData.length}`)

        // Skip row 0 (header: SN-1 | Material | Lote) — always present
        const dataRows = jsonData.slice(1)

        records = dataRows
            .filter((row: any[]) => row && row[0] != null && String(row[0]).trim().length > 0)
            .map((row: any[]) => ({
                // Col A (0): SN-1  →  series
                // Col B (1): Material
                // Col C (2): Lote  →  stored in status field
                series: String(row[0]).trim().toUpperCase(),
                material: row[1] != null ? String(row[1]).trim() : null,
                status: row[2] != null ? String(row[2]).trim() : 'disponible',
            }))

        console.log(`[SAP Upload] Valid records to insert: ${records.length}`)

    } catch (error) {
        console.error("Excel parse error", error)
        return { error: 'Error al procesar el archivo Excel/CSV' }
    }

    if (records.length === 0) {
        return { error: 'No se encontraron registros validos en el archivo.' }
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: 'Usuario no autenticado.' }
    }

    // Deduplicate by series in JS (in case the file has repeated rows)
    const uniqueMap = new Map<string, typeof records[0]>()
    for (const r of records) {
        if (!uniqueMap.has(r.series)) {
            uniqueMap.set(r.series, r)
        }
    }
    const uniqueRecords = Array.from(uniqueMap.values())

    // Clear existing SAP data before inserting fresh data (full replace)
    const { error: deleteError } = await supabase
        .from('sap_data')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) {
        console.error("Delete error", deleteError)
        return { error: `Error al limpiar datos SAP previos: ${deleteError.message}` }
    }

    // Insert in batches
    const BATCH_SIZE = 1000
    let insertedCount = 0

    for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
        const batch = uniqueRecords.slice(i, i + BATCH_SIZE)
        const { error } = await supabase
            .from('sap_data')
            .insert(batch)

        if (error) {
            console.error("Insert error", error)
            if (error.code === '42501') {
                return { error: 'Permisos insuficientes (RLS).' }
            }
            return { error: `Error insertando lote ${Math.floor(i / BATCH_SIZE)}: ${error.message}` }
        }
        insertedCount += batch.length
    }

    revalidatePath('/dashboard/config')
    return { success: true, count: insertedCount }
}

export async function clearSAPData() {
    const supabase = await createClient()
    const { error } = await supabase
        .from('sap_data')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (error) return { error: error.message }
    revalidatePath('/dashboard/config')
    return { success: true }
}

export async function getSAPRecordCount() {
    const supabase = await createClient()
    const { count, error } = await supabase
        .from('sap_data')
        .select('*', { count: 'exact', head: true })

    if (error) return { error: error.message, count: 0 }
    return { count: count || 0 }
}
