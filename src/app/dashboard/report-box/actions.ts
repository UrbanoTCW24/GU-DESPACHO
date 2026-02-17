'use server'

import { createClient } from '@/utils/supabase/server'

export async function getBoxReport(limit = 100) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('boxes')
        .select(`
            *,
            models (
                name,
                brands (name)
            ),
            users (email),
            equipment (id)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching box report:', error)
        return []
    }

    // Transform data to include count
    return data.map(box => ({
        ...box,
        item_count: box.equipment.length
    }))
}
