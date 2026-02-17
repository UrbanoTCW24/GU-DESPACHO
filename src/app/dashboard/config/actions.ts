'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBrand(formData: FormData) {
    const supabase = await createClient()
    const name = formData.get('name') as string

    if (!name) return { error: 'Brand name is required' }

    const { error } = await supabase
        .from('brands')
        .insert({ name })

    if (error) return { error: error.message }
    revalidatePath('/dashboard/config')
    return { success: true }
}

export async function deleteBrand(brandId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/config')
    return { success: true }
}

export async function createModel(
    brandId: string,
    modelName: string,
    seriesConfig: any[]
) {
    const supabase = await createClient()

    if (!modelName || !brandId) return { error: 'Data missing' }

    const { error } = await supabase
        .from('models')
        .insert({
            brand_id: brandId,
            name: modelName,
            series_config: seriesConfig
        })

    if (error) return { error: error.message }
    revalidatePath('/dashboard/config')
    return { success: true }
}

export async function updateModel(
    modelId: string,
    brandId: string,
    modelName: string,
    seriesConfig: any[]
) {
    const supabase = await createClient()

    if (!modelId || !modelName || !brandId) return { error: 'Data missing' }

    const { error } = await supabase
        .from('models')
        .update({
            brand_id: brandId,
            name: modelName,
            series_config: seriesConfig
        })
        .eq('id', modelId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/config')
    return { success: true }
}

export async function deleteModel(modelId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', modelId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/config')
    return { success: true }
}
