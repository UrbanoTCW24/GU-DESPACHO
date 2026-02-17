'use server'

import { createClient } from '@/utils/supabase/server'

export async function getDashboardStats() {
    const supabase = await createClient()
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    // 1. Boxes Created Today
    const { count: boxesToday } = await supabase
        .from('boxes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)

    // 2. Open Boxes (Pending)
    const { count: openBoxes } = await supabase
        .from('boxes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')

    // 3. Items Scanned Today
    const { count: itemsToday } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .gte('scanned_at', startOfDay)
        .lt('scanned_at', endOfDay)

    // 4. Recent Activity (Last 5 modified boxes)
    const { data: recentBoxes } = await supabase
        .from('boxes')
        .select(`
            id,
            box_number,
            status,
            updated_at:created_at, 
            users (email),
            models (name, brands (name)),
            total_items
        `)
        .order('created_at', { ascending: false })
        .limit(5)

    // Calculate completion for recent boxes needs a separate query or join, 
    // but for now we can fetch items count for these boxes if needed, 
    // or just rely on total_items vs actual items if we had a count.
    // Let's do a quick fetch for item counts for these boxes
    const recentActivity = await Promise.all((recentBoxes || []).map(async (box) => {
        const { count } = await supabase
            .from('equipment')
            .select('*', { count: 'exact', head: true })
            .eq('box_id', box.id)

        return {
            ...box,
            current_items: count || 0
        }
    }))

    return {
        boxesToday: boxesToday || 0,
        openBoxes: openBoxes || 0,
        itemsToday: itemsToday || 0,
        recentActivity: recentActivity || []
    }
}
