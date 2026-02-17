'use server'

import { createClient } from '@/utils/supabase/server'

export async function getGeneralReport(limit = 100) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('equipment')
        .select(`
            id,
            scanned_at,
            series_data,
            is_sap_validated,
            boxes (
                box_number,
                models (
                    name,
                    brands (name)
                )
            ),
            users (email)
        `)
        .order('scanned_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching report:', error)
        return []
    }

    return data
}
