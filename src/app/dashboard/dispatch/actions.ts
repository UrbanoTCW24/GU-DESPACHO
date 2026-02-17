'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createBox(modelId: string, itemsCount: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // Fallback: Generate a random box number if DB sequence trigger is missing
    // Format: BOX-{Random 6 digits}
    const fallbackBoxNumber = `BOX-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`

    // We try to insert. If 'box_number' is NULL, PG triggers (if active) should handle it.
    // BUT since we got a Not-Null violation, we know the trigger is missing/broken.
    // So we MUST provide a value.

    // Note: If you run 'create_sequence.sql', you could pass NULL here.
    // But to be safe and strictly unblock the user, we send a value.

    const { data, error } = await supabase
        .from('boxes')
        .insert({
            box_number: fallbackBoxNumber,
            created_by: user.id,
            model_id: modelId,
            total_items: itemsCount,
            status: 'open'
        })
        .select()
        .single()

    if (error) return { error: error.message }

    return { success: true, boxId: data.id }
}

export async function duplicateBox(originalBoxId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Get original box details
    const { data: original, error: fetchError } = await supabase
        .from('boxes')
        .select('*')
        .eq('id', originalBoxId)
        .single()

    if (fetchError || !original) return { error: 'Original box not found' }

    // 2. Create new box with same config
    const fallbackBoxNumber = `BOX-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`

    const { data: newBox, error: createError } = await supabase
        .from('boxes')
        .insert({
            box_number: fallbackBoxNumber,
            created_by: user.id,
            model_id: original.model_id,
            total_items: original.total_items,
            status: 'open'
        })
        .select()
        .single()

    if (createError) return { error: createError.message }

    return { success: true, boxId: newBox.id }
}

export async function updateBoxQuantity(boxId: string, newQuantity: number) {
    const supabase = await createClient()

    // Validate
    const { count } = await supabase.from('equipment').select('*', { count: 'exact', head: true }).eq('box_id', boxId)
    const currentItems = count || 0

    if (newQuantity < currentItems) {
        return { error: `No puedes reducir la cantidad a ${newQuantity} porque ya hay ${currentItems} equipos escaneados.` }
    }

    const { error } = await supabase
        .from('boxes')
        .update({ total_items: newQuantity })
        .eq('id', boxId)

    if (error) return { error: error.message }
    revalidatePath(`/dashboard/dispatch/${boxId}`)
    return { success: true }
}

export async function getOpenBoxes() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('boxes')
        .select('*, models(name, brands(name)), users(email)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

    return data || []
}

export async function deleteBox(boxId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // Double check role on server side for safety, though RLS handles it at DB level
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!userData || (userData.role !== 'admin' && userData.role !== 'super_admin')) {
        return { error: 'No tienes permisos para eliminar cajas' }
    }

    const { error } = await supabase
        .from('boxes')
        .delete()
        .eq('id', boxId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/dispatch')
    return { success: true }
}

export async function updateBox(boxId: string, modelId: string, totalItems: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // Check permissions (Admin/Super Admin)
    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!userData || (userData.role !== 'admin' && userData.role !== 'super_admin')) {
        return { error: 'No tienes permisos para editar cajas' }
    }

    const { error } = await supabase
        .from('boxes')
        .update({
            model_id: modelId,
            total_items: totalItems
        })
        .eq('id', boxId)

    if (error) return { error: error.message }
    revalidatePath('/dashboard/dispatch')
    return { success: true }
}
