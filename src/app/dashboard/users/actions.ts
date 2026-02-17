'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@/hooks/use-rbac'

export async function updateUserRole(userId: string, newRole: UserRole) {
    const supabase = await createClient()

    // Verify requester is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: requesterData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!requesterData || (requesterData.role !== 'admin' && requesterData.role !== 'super_admin')) {
        throw new Error('Unauthorized')
    }

    const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

    if (error) {
        throw new Error('Failed to update role')
    }

    revalidatePath('/dashboard/users')
}
