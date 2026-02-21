import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getBoxReport, getDailyBoxStats } from './actions'
import { getTotalBoxes } from '../dispatch/actions'
import Link from 'next/link'
import { Eye, Printer, FileText, Clock, Package } from 'lucide-react'
import { DeleteBoxButton } from '@/components/delete-box-button'


export default async function BoxReportPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let isSuperAdmin = false
    if (user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
        isSuperAdmin = userData?.role === 'super_admin'
    }

    const reportData = await getBoxReport(200)
    const totalBoxes = await getTotalBoxes()
    const dailyStats = await getDailyBoxStats()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reporte de Cajas</h1>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Boxes - Blue */}
                <Card className="border-l-4 border-l-blue-500 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Cajas Activas
                        </CardTitle>
                        <Package className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{totalBoxes}</div>
                        <p className="text-xs text-muted-foreground">
                            Sin despachar
                        </p>
                    </CardContent>
                </Card>

                {/* Avg Per Hour - Green */}
                <Card className="border-l-4 border-l-green-500 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Promedio Cajas / Hora
                        </CardTitle>
                        <Clock className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{dailyStats.avgPerHour}</div>
                        <p className="text-xs text-muted-foreground">
                            Basado en actividad de hoy ({dailyStats.boxesToday} cajas)
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-t-4 border-t-gray-200">
                <CardHeader>
                    <CardTitle>Listado de Cajas Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha Creación</TableHead>
                                    <TableHead>Número de Caja</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead>Modelo</TableHead>
                                    <TableHead className="text-center">Progreso</TableHead>
                                    <TableHead>Creado Por</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {reportData.map((box: any) => {
                                    const progress = box.total_items > 0 ? Math.round((box.item_count / box.total_items) * 100) : 0
                                    const isComplete = box.item_count >= box.total_items

                                    return (
                                        <TableRow key={box.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {new Date(box.created_at).toLocaleString('es-MX', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                })}
                                            </TableCell>
                                            <TableCell className="font-bold text-lg">{box.box_number}</TableCell>
                                            <TableCell className="font-medium">{box.models?.brands?.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{box.models?.name}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-bold ${isComplete ? 'text-green-600' : 'text-orange-500'}`}>
                                                        {box.item_count} / {box.total_items}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{progress}%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                                {box.users?.name || box.users?.email || 'Sistema'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={box.status === 'closed' || box.status === 'dispatched' ? 'secondary' : 'default'} className={box.status === 'closed' || box.status === 'dispatched' ? 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300' : ''}>
                                                    {box.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" asChild title="Ver caja">
                                                        <Link href={`/dashboard/dispatch/${box.id}`}>
                                                            <Eye className="h-4 w-4 text-blue-600" />
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" asChild title="Ver Carátula">
                                                        <Link href={`/dashboard/dispatch/${box.id}/print-summary`}>
                                                            <FileText className="h-4 w-4 text-orange-600" />
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" asChild title="Imprimir detalle">
                                                        <Link href={`/dashboard/dispatch/${box.id}/print`}>
                                                            <Printer className="h-4 w-4 text-zinc-600" />
                                                        </Link>
                                                    </Button>
                                                    {isSuperAdmin && (
                                                        <DeleteBoxButton
                                                            boxId={box.id}
                                                            boxNumber={box.box_number}
                                                            variant="ghost"
                                                            size="icon"
                                                            iconOnly={true}
                                                        />
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {reportData.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8">
                                            No hay registros disponibles.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
