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
import { getGeneralReport } from './actions'
import { DownloadReportButton } from './download-button'
import { DeleteBoxButton } from '@/components/delete-box-button'

export default async function ReportPage() {
    const reportData = await getGeneralReport(200)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let isSuperAdmin = false
    if (user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
        isSuperAdmin = userData?.role === 'super_admin'
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reporte General de Series</h1>
                <DownloadReportButton />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Detalle de Equipos Registrados (Últimos 200)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Caja</TableHead>
                                    <TableHead>Marca / Modelo</TableHead>
                                    <TableHead>Material</TableHead>
                                    <TableHead>Serie SAP / Principal</TableHead>
                                    <TableHead>Serie 2</TableHead>
                                    <TableHead>Datos Adicionales</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Estado</TableHead>
                                    {isSuperAdmin && <TableHead>Acciones</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {reportData.map((item: any) => {
                                    // Extract series values
                                    const seriesValues = Object.values(item.series_data || {})
                                    const primarySeries = seriesValues[0] as string || '-'
                                    const secondarySeries = seriesValues[1] as string || '-'
                                    const otherSeries = seriesValues.slice(2).join(', ')

                                    // Material column placeholder (using Model Name for now as requested by user often they are same or linked)
                                    // If user needs specific material code, we'd need to add it to schema.
                                    const material = item.boxes?.models?.name || '-'

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="whitespace-nowrap">
                                                {new Date(item.scanned_at).toLocaleString('es-MX', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell className="font-bold">{item.boxes?.box_number}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{item.boxes?.models?.brands?.name}</span>
                                                    <span className="text-xs text-muted-foreground">{item.boxes?.models?.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{material}</TableCell>
                                            <TableCell className="font-mono">{primarySeries}</TableCell>
                                            <TableCell className="font-mono text-sm">{secondarySeries}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{otherSeries}</TableCell>
                                            <TableCell className="text-sm">{item.users?.email}</TableCell>
                                            <TableCell>
                                                {item.is_sap_validated ? (
                                                    <Badge className="bg-green-600">Validado</Badge>
                                                ) : (
                                                    <Badge variant="outline">Manual</Badge>
                                                )}
                                            </TableCell>
                                            {isSuperAdmin && (
                                                <TableCell>
                                                    <DeleteBoxButton
                                                        boxId={item.boxes?.id}
                                                        boxNumber={item.boxes?.box_number}
                                                        variant="ghost"
                                                        size="icon"
                                                        iconOnly={true}
                                                    />
                                                </TableCell>
                                            )}
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
