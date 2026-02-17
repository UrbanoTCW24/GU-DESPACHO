'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadSAPData(formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File

    if (!file) {
        return { error: 'No file uploaded' }
    }

    // Basic CSV parsing
    const text = await file.text()
    const lines = text.split('\n')

    // Assume first column is Series, second is Status (optional)
    // Skip header if needed (we'll try to detect or just assume no header/simple list)

    const records = lines
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            const parts = line.split(/[;,]/) // Split by comma or semicolon
            return {
                series: parts[0].trim(),
                material: parts[1]?.trim() || null,
                status: parts[2]?.trim() || 'pending'
            }
        })
        .filter(r => r.series.length > 0)

    if (records.length === 0) {
        return { error: 'No valid records found' }
    }

    // Bulk insert
    const { error } = await supabase
        .from('sap_data')
        .insert(records)

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/dashboard/config')
    return { success: true, count: records.length }
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
