'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function promoteToSuperAdmin() {
    const supabase = await createClient()

    // Get current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
        console.error("Auth error:", authError)
        return
    }

    // Upsert into public.users
    const { error: upsertError } = await supabase
        .from('users')
        .upsert({
            id: user.id,
            email: user.email,
            role: 'super_admin'
        })

    if (upsertError) {
        console.error("Upsert error:", upsertError)
        // If error, maybe table doesn't exist? But we assume it does based on previous context.
        return
    }

    redirect('/dashboard')
}
