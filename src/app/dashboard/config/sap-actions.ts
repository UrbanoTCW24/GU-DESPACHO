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
            row.some((cell: any) => String(cell).toLowerCase().includes('serie') || String(cell).toLowerCase().includes('sn-1'))
        )

        const dataRows = (startIndex !== -1) ? jsonData.slice(startIndex + 1) : jsonData

        records = dataRows
            .filter(row => row && row.length > 0 && row[0]) // Ensure first col (SN1) exists
            .map(row => {
                // Mapping: 
                // Col 0: SN-1 (Mandatory)
                // Col 1: SN-2 (Optional)
                // Col 2: SN-3 (Optional)
                // Col 3: SN-4 (Optional)
                // Col 4: Material (Optional)
                // Col 5: Status (Optional)

                return {
                    sn1: String(row[0]).trim(),
                    sn2: row[1] ? String(row[1]).trim() : null,
                    sn3: row[2] ? String(row[2]).trim() : null,
                    sn4: row[3] ? String(row[3]).trim() : null,
                    material: row[4] ? String(row[4]).trim() : null,
                    status: row[5] ? String(row[5]).trim() : 'disponible'
                }
            })
            .filter(r => r.sn1.length > 0)

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

    const BATCH_SIZE = 1000
    let insertedCount = 0

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE)
        const { error } = await supabase
            .from('sap_base') // Target new table
            .insert(batch)

        if (error) {
            console.error("Insert error", error)
            if (error.code === '42501') {
                return { error: 'Permisos insuficientes (RLS).' }
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
