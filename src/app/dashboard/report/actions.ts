'use server'

import { createClient } from '@/utils/supabase/server'

export async function getTotalEquipment() {
    const supabase = await createClient()
    const { count, error } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })

    if (error) return 0
    return count || 0
}

export async function getGeneralReport(limit = 100) {
    const supabase = await createClient()

    let query = supabase
        .from('equipment')
        .select('*, boxes:boxes(box_number, models(name, brands(name))), users:users!equipment_scanned_by_fkey(email, name)')
        .order('scanned_at', { ascending: false })

    let allData: any[] = []
    let page = 0
    const pageSize = 1000

    if (limit > 0) {
        query = query.limit(limit)
        const { data, error } = await query
        if (error) {
            console.error('Error fetching report:', JSON.stringify(error, null, 2))
            return []
        }
        return data
    } else {
        // Fetch all data using pagination
        while (true) {
            const { data, error } = await supabase
                .from('equipment')
                .select('*, boxes:boxes(box_number, models(name, brands(name))), users:users!equipment_scanned_by_fkey(email, name)')
                .order('scanned_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1)

            if (error) {
                console.error('Error fetching report page:', page, JSON.stringify(error, null, 2))
                break
            }

            if (!data || data.length === 0) {
                break
            }

            allData = [...allData, ...data]

            if (data.length < pageSize) {
                break
            }

            page++
        }
        return allData
    }


}
