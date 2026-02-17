'use server'

import { createClient } from '@/utils/supabase/server'

export async function searchEquipmentBySeries(query: string) {
    const supabase = await createClient()

    // 1. Search for boxes matching the query
    const { data: boxes } = await supabase
        .from('boxes')
        .select('id')
        .ilike('box_number', `%${query}%`)
        .limit(5)

    const boxIds = boxes?.map(b => b.id) || []

    // 2. Build the equipment query
    // We want matching series OR matching box_id
    let searchBuilder = supabase
        .from('equipment')
        .select(`
            id,
            box_id,
            scanned_at,
            is_sap_validated,
            series_data,
            boxes (box_number, status),
            users (email)
        `)

    if (boxIds.length > 0) {
        // If we found boxes, use an OR condition: series match OR box_id match
        // Note: PostgREST syntax for OR with different columns is tricky.
        // It's easier to fetch by series match, and also fetch by box_id, then combine or use specific OR syntax.
        // .or(`series_data.ilike.%${query}%,box_id.in.(${boxIds.join(',')})`) // JSONB cast issue again.

        // Let's rely on explicit OR string if possible, but series_data::text casting makes it hard in .or()

        // Alternative: Fetch both valid sets and combine in application layer (simplest for now)
        const { data: seriesMatches } = await supabase
            .from('equipment')
            .select(`
                id,
                box_id,
                scanned_at,
                is_sap_validated,
                series_data,
                boxes (box_number, status),
                users (email)
            `)
            .like('series_data::text', `%${query}%`)
            .order('scanned_at', { ascending: false })
            .limit(20)

        const { data: boxMatches } = await supabase
            .from('equipment')
            .select(`
                id,
                box_id,
                scanned_at,
                is_sap_validated,
                series_data,
                boxes (box_number, status),
                users (email)
            `)
            .in('box_id', boxIds)
            .order('scanned_at', { ascending: false })
            .limit(50) // Allow more items if searching by box

        // Combine and deduplicate
        const combined = [...(seriesMatches || []), ...(boxMatches || [])]
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values())

        return unique
    } else {
        // Only search by series if no box matches found
        const { data, error } = await supabase
            .from('equipment')
            .select(`
                id,
                box_id,
                scanned_at,
                is_sap_validated,
                series_data,
                boxes (box_number, status),
                users (email)
            `)
            .like('series_data::text', `%${query}%`)
            .order('scanned_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('Search error:', error)
            return []
        }
        return data || []
    }
}
