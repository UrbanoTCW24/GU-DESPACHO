import { createClient } from '@/utils/supabase/server'
import { ActiveBoxesList } from '../dispatch/active-boxes-list'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Box, History, Package } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PalletsView } from './pallets-view'
import { getActivePallets } from './pallet-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ShipmentsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const supabase = await createClient()
    const { tab } = await searchParams

    // Boxes not dispatched and not in a pallet → available for "Cajas Sueltas" tab
    const { data: availableBoxes } = await supabase
        .from('boxes')
        .select(`
            *, 
            models(name, brands(name)), 
            users(email, name),
            equipment(count)
        `)
        .is('dispatch_id', null)
        .is('pallet_id', null)
        .order('created_at', { ascending: false })

    // Boxes not dispatched (with or without pallet) → for the pallet scanner
    const { data: allActiveBoxes } = await supabase
        .from('boxes')
        .select('id, box_number, pallet_id, dispatch_id, models(name, brands(name))')
        .is('dispatch_id', null)

    // Active pallets (not dispatched) with their boxes
    const activePallets = await getActivePallets()

    // KPI: total non-dispatched boxes and equipment
    const { count: totalBoxes } = await supabase
        .from('boxes')
        .select('*', { count: 'exact', head: true })
        .is('dispatch_id', null)

    const { count: totalEquipment } = await supabase
        .from('equipment')
        .select('*, boxes!inner(dispatch_id)', { count: 'exact', head: true })
        .is('boxes.dispatch_id', null)

    // Auth
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = user
        ? await supabase.from('users').select('role').eq('id', user.id).single()
        : { data: null }
    const isAdmin = userData?.role === 'admin' || userData?.role === 'super_admin'

    // Default tab from URL
    const defaultTab = tab === 'tarimas' ? 'tarimas' : 'cajas'

    return (
        <div className="space-y-6">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Salida de Mercancía</h1>
                    <p className="text-muted-foreground">Selecciona cajas o tarimas para asignar Salida SAP</p>
                </div>
                <Link
                    href="/dashboard/dispatch/history"
                    className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
                >
                    <History className="h-4 w-4" />
                    Historial de Despachos
                </Link>
            </div>

            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 max-w-lg">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cajas</CardTitle>
                        <Box className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalBoxes ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Cajas pendientes de despacho</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Producto</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEquipment ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Equipos pendientes de despacho</p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Tabs ───────────────────────────────────────────────────── */}
            <Tabs defaultValue={defaultTab}>
                <TabsList className="grid w-full max-w-xs grid-cols-2">
                    <TabsTrigger value="cajas">📦 Cajas Sueltas</TabsTrigger>
                    <TabsTrigger value="tarimas">🏗️ Tarimas</TabsTrigger>
                </TabsList>

                {/* ─ Cajas Sueltas ─────────────────────────────────────── */}
                <TabsContent value="cajas" className="mt-6">
                    <ActiveBoxesList
                        boxes={availableBoxes || []}
                        models={[]}
                        isAdmin={isAdmin}
                        mode="shipping"
                    />
                </TabsContent>

                {/* ─ Tarimas ───────────────────────────────────────────── */}
                <TabsContent value="tarimas" className="mt-6">
                    <PalletsView
                        pallets={activePallets}
                        availableBoxes={(allActiveBoxes || []).filter(b => !b.pallet_id)}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
