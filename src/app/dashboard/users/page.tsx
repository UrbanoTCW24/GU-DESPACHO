import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { UserTable } from './user-table'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function UsersPage() {
    const supabase = await createClient()

    // 1. Verify User is Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: requesterData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!requesterData || (requesterData.role !== 'admin' && requesterData.role !== 'super_admin')) {
        redirect('/dashboard')
    }

    // 2. Fetch All Users
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return <div>Error loading users</div>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Usuarios</CardTitle>
                    <CardDescription>Administra los permisos y roles de los usuarios del sistema.</CardDescription>
                </CardHeader>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <UserTable users={users as any} />
            </Card>
        </div>
    )
}
