import { createClient } from '@/utils/supabase/server'
import { NewBoxForm } from './new-box-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActiveBoxesList } from './active-boxes-list'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getTotalBoxes } from './actions'

export default async function DispatchPage() {
    const supabase = await createClient()
    const totalBoxes = await getTotalBoxes()

    // Fetch models for the form
    const { data: models } = await supabase
        .from('models')
        .select('*, brands(name)')
        .order('name')

    // Fetch active (open) boxes for packing view
    const { data: activeBoxes } = await supabase
        .from('boxes')
        .select(`
            *, 
            models(name, brands(name)), 
            users(email, name),
            equipment(count)
        `)
        .eq('status', 'open')
        .is('dispatch_id', null)
        .order('created_at', { ascending: false })

    // Check current user role
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = user
        ? await supabase.from('users').select('role').eq('id', user.id).single()
        : { data: null }
    const isAdmin = userData?.role === 'admin' || userData?.role === 'super_admin'

    return (
        <div className="space-y-8">
            {/* KPI Card */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Cajas Abiertas
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-blue-500"
                        >
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                            <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalBoxes}</div>
                        <p className="text-xs text-muted-foreground">
                            Cajas activas sin despachar
                        </p>
                        <Link
                            href="/dashboard/dispatch/history"
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full mt-2")}
                        >
                            Ver Historial de Salidas
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Boxes list + New box form side by side */}
            <div className="flex flex-col md:flex-row gap-8">
                <ActiveBoxesList
                    boxes={activeBoxes || []}
                    models={models || []}
                    isAdmin={isAdmin}
                    mode="packing"
                />
                <div className="w-full md:w-80 shrink-0">
                    <NewBoxForm models={models || []} />
                </div>
            </div>
        </div>
    )
}
