'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createBox(modelId: string, itemsCount: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // We pass 'BOX-PENDING' so the DB Trigger picks it up and replaces it with 'CAJA-XXXXXX'
    // The trigger condition is: (NEW.box_number IS NULL OR NEW.box_number LIKE 'BOX-%')
    const placeholderBoxNumber = 'BOX-PENDING'

    const { data, error } = await supabase
        .from('boxes')
        .insert({
            box_number: placeholderBoxNumber,
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

export async function getTotalBoxes() {
    const supabase = await createClient()
    const { count, error } = await supabase
        .from('boxes')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'dispatched')

    if (error) return 0
    return count || 0
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
    const placeholderBoxNumber = 'BOX-PENDING'

    const { data: newBox, error: createError } = await supabase
        .from('boxes')
        .insert({
            box_number: placeholderBoxNumber,
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

export async function createDispatch(
    boxIds: string[],
    sapExitId: string,
    type: 'BOX' | 'PALLET',
    notes?: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    if (!boxIds || boxIds.length === 0) {
        return { error: 'No se han seleccionado cajas para despachar.' }
    }

    if (!sapExitId) {
        return { error: 'El ID de Salida SAP es obligatorio.' }
    }

    // 1. Create Dispatch Record
    const { data: dispatch, error: dispatchError } = await supabase
        .from('dispatches')
        .insert({
            created_by: user.id,
            sap_exit_id: sapExitId,
            type: type,
            notes: notes,
            // pallet_id can be added if we implement "Pre-Palletizing", 
            // but for now we dispatch a SET of boxes as a PALLET type dispatch.
        })
        .select()
        .single()

    if (dispatchError) {
        console.error('Error creating dispatch:', dispatchError)
        return { error: 'Error al crear el registro de despacho: ' + dispatchError.message }
    }

    // 2. Update Boxes with dispatch_id AND mark as dispatched
    const { error: boxError } = await supabase
        .from('boxes')
        .update({ dispatch_id: dispatch.id, status: 'dispatched' })
        .in('id', boxIds)

    if (boxError) {
        console.error('Error updating boxes:', boxError)
        return { error: 'Error al vincular cajas al despacho: ' + boxError.message }
    }

    revalidatePath('/dashboard/dispatch')
    revalidatePath('/dashboard/report')
    return { success: true, dispatchId: dispatch.id }
}
