'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteBox(boxId: string) {
    const supabase = await createClient()

    // Check if user is SuperAdmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'super_admin') {
        return { error: 'No tienes permisos para realizar esta acción' }
    }

    // Delete the box (Cascading delete should handle items if configured, but let's be safe/explicit if needed)
    // Assuming DB has cascade delete on items foreign key to boxes. 
    // If not, we'd need to delete items first. 
    // Let's assume we might need to delete items first just in case or trust cascade.
    // Based on `deleteEquipment` existing, let's try deleting the box directly. 
    // Usually `on delete cascade` is set. If not, this will fail.

    const { error } = await supabase
        .from('boxes')
        .delete()
        .eq('id', boxId)

    if (error) {
        console.error('Error deleting box:', error)
        return { error: 'Error al eliminar la caja: ' + error.message }
    }

    revalidatePath('/dashboard/report-box')
    revalidatePath('/dashboard/report')
    revalidatePath('/dashboard/dispatch')
    return { success: true }
}
