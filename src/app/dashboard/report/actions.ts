'use server'

import { createClient } from '@/utils/supabase/server'

export async function getTotalEquipment() {
    const supabase = await createClient()
    const { count, error } = await supabase
        .from('equipment')
        .select('*, boxes!inner(status)', { count: 'exact', head: true })
        .neq('boxes.status', 'dispatched')

    if (error) return 0
    return count || 0
}

export async function getGeneralReport(
    limit = 100, // Kept for backward compatibility, but acting as pageSize if page is provided
    page?: number,
    filters?: { brand?: string; model?: string; material?: string }
) {
    const supabase = await createClient()

    let query = supabase
        .from('equipment')
        .select(`
            *,
            boxes!inner (
                box_number,
                models!inner (
                    name,
                    brands!inner (
                        name
                    )
                )
            ),
            users:users!equipment_scanned_by_fkey(email, name)
        `, { count: 'exact' })
        .neq('boxes.status', 'dispatched') // Only show equipment in active (non-dispatched) boxes
        .order('scanned_at', { ascending: false })

    // Apply Filters
    if (filters?.brand && filters.brand !== 'all') {
        query = query.eq('boxes.models.brands.name', filters.brand)
    }
    if (filters?.model && filters.model !== 'all') {
        query = query.eq('boxes.models.name', filters.model)
    }
    if (filters?.material && filters.material !== 'all') {
        query = query.eq('material', filters.material)
    }

    // Handle "Select All" for export (limit 0) - Kept logic for download button using this
    if (limit === 0) {
        // Warning: This export logic with filters needs to reuse the same query but fetch all.
        // If limit is 0, we fetch EVERYTHING (paginated internally if needed for performance, but returning allData).
        // Reuse the logic but apply filters.

        // For simplicity, let's just use the query with high limit or internal pagination if we really expect >10k rows with filters.
        // But since we had a special loop for limit=0 before, let's adapt it.
        // Actually, the download button can just request a high limit or we can iterate.
        // Let's keep the iteration logic for limit=0 but WITH FILTERS.

        let allData: any[] = []
        let p = 0
        const pageSize = 1000

        while (true) {
            // Re-construct query builder for each page to avoid state issues with .range()
            let q = supabase
                .from('equipment')
                .select(`
                    *,
                    boxes!inner (
                        box_number, 
                        models!inner (
                            name, 
                            brands!inner (
                                name
                            )
                        )
                    ),
                    users:users!equipment_scanned_by_fkey(email, name)
                `)
                .order('scanned_at', { ascending: false })

            if (filters?.brand && filters.brand !== 'all') q = q.eq('boxes.models.brands.name', filters.brand)
            if (filters?.model && filters.model !== 'all') q = q.eq('boxes.models.name', filters.model)
            if (filters?.material && filters.material !== 'all') q = q.eq('material', filters.material)

            const { data, error } = await q.range(p * pageSize, (p + 1) * pageSize - 1)

            if (error) {
                console.error('Error fetching report page:', p, JSON.stringify(error, null, 2))
                break
            }
            if (!data || data.length === 0) break
            allData = [...allData, ...data]
            if (data.length < pageSize) break
            p++
        }
        return allData
    }

    // Normal Pagination
    const effectivePage = page && page > 0 ? page : 1
    const from = (effectivePage - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
        console.error('Error fetching report:', JSON.stringify(error, null, 2))
        return { data: [], count: 0 }
    }

    return { data, count }
}



export async function getFilterOptions() {
    const supabase = await createClient()

    // Fetch Brands
    const { data: brands } = await supabase.from('brands').select('id, name').order('name')

    // Fetch Models
    const { data: models } = await supabase.from('models').select('id, name, brand_id').order('name')

    // Fetch Distinct Materials (using a hack since Supabase doesn't support distinct easily on client)
    // We'll fetch all materials and unique them in JS for now (assuming not massive cardinality)
    // Or better, use rpc if available, but let's stick to simple query for now.
    // If equipment table is large, this might be slow. Optimization: create a db view or function.
    // For now, let's try fetching materials from sap_data which might be cleaner?
    // No, user wants materials present in the system.
    const { data: materialsData } = await supabase
        .from('equipment')
        .select('material')
        .not('material', 'is', null)

    const materials = Array.from(new Set(materialsData?.map(m => m.material))).sort()

    return {
        brands: brands || [],
        models: models || [],
        materials: materials || []
    }
}

export async function getGlobalSeriesReport(filters?: { brand?: string, model?: string, material?: string }) {
    const supabase = await createClient()
    let allData: any[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
        let query = supabase
            .from('global_series_registry')
            .select(`
                series,
                created_at,
                boxes!inner (
                    box_number, 
                    models!inner (
                        name, 
                        brands!inner (
                            name
                        )
                    )
                ),
                equipment!inner (
                    material,
                    users (name, email)
                )
            `)
            .order('created_at', { ascending: false })

        // Apply Filters
        if (filters?.brand && filters.brand !== 'all') {
            query = query.eq('boxes.models.brands.name', filters.brand)
        }
        if (filters?.model && filters.model !== 'all') {
            query = query.eq('boxes.models.name', filters.model)
        }
        if (filters?.material && filters.material !== 'all') {
            query = query.eq('equipment.material', filters.material)
        }

        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
            console.error('Error fetching global series report:', JSON.stringify(error, null, 2))
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
