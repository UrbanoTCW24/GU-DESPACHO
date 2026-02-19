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

import { getGeneralReport, getTotalEquipment, getFilterOptions } from './actions'
import { DownloadReportButton } from './download-button'
import { DeleteBoxButton } from '@/components/delete-box-button'
import { Pagination } from '@/components/ui/pagination'
import { ReportFilters } from './report-filters'

export default async function ReportPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const page = Number(searchParams.page) || 1
    const pageSize = 20 // Default page size for viewing
    const brand = searchParams.brand as string
    const model = searchParams.model as string
    const material = searchParams.material as string

    const filters = { brand, model, material }

    const result = await getGeneralReport(pageSize, page, filters)

    // Handle both return types for backward compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reportData = Array.isArray(result) ? result : (result as any).data || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const count = Array.isArray(result) ? result.length : (result as any).count || 0
    const totalEquipment = await getTotalEquipment()
    const filterOptions = await getFilterOptions()

    // Calculate total pages for pagination
    // Note: count is total records matching query.
    // getGeneralReport returns { data, count } now.
    const totalPages = Math.ceil((count || 0) / pageSize)

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

            {/* KPI Card */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Equipos Registrados
                        </CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-green-500"
                        >
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{totalEquipment}</div>
                        <p className="text-xs text-muted-foreground">
                            Total histórico de equipos validados
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Detalle de Equipos Registrados</CardTitle>
                        {/* We will implement ReportFilters component next or inline it temporarily if simple */}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <ReportFilters options={filterOptions} />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Caja</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead>Modelo</TableHead>
                                    <TableHead>Material</TableHead>
                                    <TableHead>Serie SAP / Principal</TableHead>
                                    <TableHead>Series Adicionales</TableHead>
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
                                    // Get all other series as an array
                                    const additionalSeries = seriesValues.slice(1) as string[]

                                    // Material from SAP validation
                                    const material = item.material || '-'

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
                                            <TableCell>{item.boxes?.models?.brands?.name}</TableCell>
                                            <TableCell>{item.boxes?.models?.name}</TableCell>
                                            <TableCell className="font-mono font-bold text-blue-600">{material}</TableCell>
                                            <TableCell className="font-mono font-medium">{primarySeries}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-[300px]">
                                                    {additionalSeries.length > 0 ? (
                                                        additionalSeries.map((serie, idx) => (
                                                            <Badge key={idx} variant="outline" className="font-mono text-xs bg-slate-50">
                                                                {serie}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {item.users?.name || item.users?.email}
                                            </TableCell>
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

                    <div className="mt-4">
                        <Pagination
                            totalPages={totalPages}
                            currentPage={page}
                            totalRecords={count || 0}
                            pageSize={pageSize}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

