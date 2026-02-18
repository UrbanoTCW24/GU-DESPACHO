'use server'

import { createClient } from '@/utils/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            users (email, name),
            equipment (id)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching box report:', error)
        return []
    }

    // Transform data to include count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((box: any) => ({
        ...box,
        item_count: box.equipment.length
    }))
}

export async function getDailyBoxStats() {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Get boxes created today
    const { data: boxes, error } = await supabase
        .from('boxes')
        .select('created_at')
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: true })

    if (error || !boxes) return { boxesToday: 0, avgPerHour: 0 }

    const boxesToday = boxes.length
    if (boxesToday === 0) return { boxesToday: 0, avgPerHour: 0 }

    // Calculate hours from first box to now
    const firstBoxTime = new Date(boxes[0].created_at).getTime()
    const now = new Date().getTime()
    const hoursPassed = (now - firstBoxTime) / (1000 * 60 * 60)

    // Avoid division by zero or extremely small numbers
    const avg = hoursPassed < 0.1 ? boxesToday : (boxesToday / hoursPassed)

    return {
        boxesToday,
        avgPerHour: Math.round(avg * 10) / 10 // Round to 1 decimal
    }
}
