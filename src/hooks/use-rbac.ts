import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export type UserRole = 'operator' | 'admin' | 'super_admin'

interface UserData {
    id: string
    email: string
    role: UserRole
}

export function useUserRole() {
    const [user, setUser] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function getUser() {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser()

                if (!authUser) {
                    setUser(null)
                    setLoading(false)
                    return
                }

                // Fetch user role from 'users' table
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', authUser.id)
                    .single()

                if (error || !userData) {
                    console.error('Error fetching user role:', error)
                    // Fallback or handle error - maybe force logout or show error
                    setUser(null)
                } else {
                    setUser({
                        id: authUser.id,
                        email: authUser.email!,
                        role: userData.role as UserRole
                    })
                }
            } catch (error) {
                console.error('Unexpected error:', error)
            } finally {
                setLoading(false)
            }
        }

        getUser()
    }, [supabase, router])

    return { user, loading }
}

export function useRequireRole(allowedRoles: UserRole[]) {
    const { user, loading } = useUserRole()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        } else if (!loading && user && !allowedRoles.includes(user.role)) {
            // Redirect to unauthorized or dashboard if logged in but wrong role
            router.push('/dashboard?error=Unauthorized')
        }
    }, [user, loading, allowedRoles, router])

    return { user, loading }
}
