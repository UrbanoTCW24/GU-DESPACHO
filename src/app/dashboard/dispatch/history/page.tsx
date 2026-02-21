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
import { DispatchDownloadButton } from './dispatch-download-button'
import { Pagination } from '@/components/ui/pagination'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link' // Import Link
import { createDispatch } from '../actions' // Import createDispatch just to ensure action exists, but mainly we use getDispatches

import { getDispatches } from './actions'

export default async function DispatchHistoryPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const page = Number(searchParams.page) || 1
    const search = searchParams.search as string || ''
    const pageSize = 20

    const { data: dispatches, count } = await getDispatches(page, pageSize, search)
    const totalPages = Math.ceil(count / pageSize)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Historial de Despachos</h1>
                    <p className="text-muted-foreground">Registro de salidas por Tarima o Caja</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/dispatch">Nueva Salida</Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Despachos Realizados</CardTitle>
                        <form className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar SAP ID..."
                                    name="search"
                                    defaultValue={search}
                                    className="pl-8 w-[250px]"
                                />
                            </div>
                            <Button type="submit">Buscar</Button>
                        </form>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Salida SAP</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Cajas</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Notas</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dispatches.map((dispatch: any) => (
                                    <TableRow key={dispatch.id}>
                                        <TableCell>
                                            {new Date(dispatch.created_at).toLocaleString('es-MX', {
                                                dateStyle: 'short',
                                                timeStyle: 'short'
                                            })}
                                        </TableCell>
                                        <TableCell className="font-mono font-bold text-lg">
                                            {dispatch.sap_exit_id}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={dispatch.type === 'PALLET' ? 'default' : 'secondary'}>
                                                {dispatch.type === 'PALLET' ? 'TARIMA' : 'CAJA'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {/* Count query returns array of objects for related table count usually, but simplified here we assume exact count logic or we count arrays if fetched */}
                                            {dispatch.boxes?.[0]?.count ? dispatch.boxes[0].count : dispatch.boxes?.length || 0}
                                        </TableCell>
                                        <TableCell>
                                            {dispatch.users?.name || dispatch.users?.email}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                            {dispatch.notes || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DispatchDownloadButton
                                                dispatchId={dispatch.id}
                                                sapId={dispatch.sap_exit_id}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {dispatches.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            No se encontraron despachos.
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
                            totalRecords={count}
                            pageSize={pageSize}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
