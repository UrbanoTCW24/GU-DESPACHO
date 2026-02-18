import { createClient } from '@/utils/supabase/server'
import { NewBoxForm } from './new-box-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { DeleteBoxButton } from './delete-box-button'
import { EditBoxDialog } from './edit-box-dialog'

import { getOpenBoxes, getTotalBoxes } from './actions'

export default async function DispatchPage() {
    const supabase = await createClient()
    const totalBoxes = await getTotalBoxes()

    // Fetch models for the form
    const { data: models } = await supabase
        .from('models')
        .select('*, brands(name)')
        .order('name')

    // Fetch active boxes (optional: filter by user if simple operator)
    const { data: activeBoxes } = await supabase
        .from('boxes')
        .select('*, models(name, brands(name)), users(email, name)')
        .eq('status', 'open')
        .order('created_at', { ascending: false })

    // Check current user role for UI
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = user ? await supabase.from('users').select('role').eq('id', user.id).single() : { data: null }
    const isAdmin = userData?.role === 'admin' || userData?.role === 'super_admin'

    return (
        <div className="space-y-8">
            {/* KPI Card */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Cajas Realizadas
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
                        <div className="text-2xl font-bold text-slate-800">{totalBoxes}</div>
                        <p className="text-xs text-muted-foreground">
                            Total histórico en el sistema
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-4">Cajas Activas</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {activeBoxes?.map(box => (
                            <Card key={box.id} className="hover:shadow-md transition-shadow relative border-l-4 border-l-orange-400">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{box.box_number}</CardTitle>
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">Abierta</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {box.models?.brands?.name} {box.models?.name}
                                    </p>
                                    {isAdmin && (
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <EditBoxDialog box={box} models={models || []} />
                                            <DeleteBoxButton boxId={box.id} boxNumber={box.box_number} />
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm space-y-2">
                                        <p>Creado por: {box.users?.name || box.users?.email}</p>
                                        <p>Items: 0 / {box.total_items}</p>
                                        <Button asChild className="w-full mt-2" size="sm">
                                            <Link href={`/dashboard/dispatch/${box.id}`}>
                                                Continuar Despacho <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {activeBoxes?.length === 0 && (
                            <p className="text-muted-foreground">No hay cajas abiertas actualmente.</p>
                        )}
                    </div>
                </div>
                <div className="w-full md:w-1/3">
                    <NewBoxForm models={models || []} />
                </div>
            </div>
        </div >
    )
}
