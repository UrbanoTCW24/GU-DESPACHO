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
