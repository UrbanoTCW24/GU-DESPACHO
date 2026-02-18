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

    const { data, error } = await supabase
        .from('equipment')
        .select('*, boxes(box_number, models(name, brands(name))), users(email, name)')
        .order('scanned_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching report:', error)
        return []
    }

    return data
}
