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

export async function createUser(data: { email: string; password: string; role: string; name: string }) {
    const supabase = await createClient()

    // 1. Verify requester is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: requesterData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!requesterData || (requesterData.role !== 'admin' && requesterData.role !== 'super_admin')) {
        return { error: 'No tienes permisos para crear usuarios' }
    }

    // 2. Init Admin Client (Requires Service Role Key)
    // Note: This must be defined in .env.local for this to work
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SERVICE_ROLE_KEY) {
        return { error: 'Configuración de servidor incompleta (Falta Service Role Key)' }
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // 3. Create User in Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: data.name }
    })

    if (createError) {
        return { error: createError.message }
    }

    if (!newUser.user) {
        return { error: 'Error desconocido al crear usuario' }
    }

    // 4. Update Role and Name in Public Table
    // We can use the admin client to update public.users directly to ensure permissions
    // Note: If the trigger exists, it might have created the row already.
    // We use upsert or update to ensure name and role are set.
    const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role: data.role, name: data.name })
        .eq('id', newUser.user.id)

    if (updateError) {
        // Fallback: user created but role update failed.
        return { error: `Usuario creado, pero error al asignar datos: ${updateError.message}` }
    }

    revalidatePath('/dashboard/users')
    return { success: true }
}
