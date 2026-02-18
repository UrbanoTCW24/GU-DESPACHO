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
        const jsonData = utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

        // Filter and map
        // Assume row 0 is header if it contains "Serie" or "Material", otherwise data.
        // Or just look for data rows.

        const startIndex = jsonData.findIndex(row =>
            row.some((cell: any) => String(cell).toLowerCase().includes('serie'))
        )

        // If header found, start from next row. If not, start from 0? 
        // User request implies specific structure: Serie, Material, Estado.
        // Let's assume strict columnar order if no header, or map by header index if present.

        const dataRows = (startIndex !== -1) ? jsonData.slice(startIndex + 1) : jsonData

        records = dataRows
            .filter(row => row && row.length > 0 && row[0]) // Ensure first col (Serie) exists
            .map(row => {
                return {
                    series: String(row[0]).trim(),
                    material: row[1] ? String(row[1]).trim() : null,
                    status: row[2] ? String(row[2]).trim() : 'disponible'
                }
            })
            .filter(r => r.series.length > 0)

    } catch (error) {
        console.error("Excel parse error", error)
        return { error: 'Error al procesar el archivo Excel/CSV' }
    }

    if (records.length === 0) {
        return { error: 'No se encontraron registros validos en el archivo.' }
    }

    // Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        console.error("Auth error", authError)
        return { error: 'Usuario no autenticado. Por favor inicie sesión nuevamente.' }
    }

    // Bulk insert (chunking might be needed for very large files, but start simple)
    // Supabase generic limit is often 1000s, usually handles 10k ok? 
    // Let's do batches of 1000 to be safe.

    const BATCH_SIZE = 1000
    let insertedCount = 0
    let errorCount = 0

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE)
        const { error } = await supabase
            .from('sap_data')
            .insert(batch)

        if (error) {
            console.error("Insert error", error)
            // Continue? Or abort? 
            // Ideally we want atomic, but big files atomic is hard.
            // Let's return first error for now.
            if (error.code === '42501') {
                return { error: 'Permisos insuficientes (RLS). Contacte al administrador para habilitar la inserción en "sap_data".' }
            }
            return { error: `Error insertando lote ${i}: ${error.message}` }
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
