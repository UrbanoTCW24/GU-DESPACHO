import { getBoxDetails } from '../actions'

import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PrintButton } from '@/components/print-button'

export default async function PrintPage(props: { params: Promise<{ boxId: string }> }) {
    const params = await props.params;
    const box = await getBoxDetails(params.boxId)

    if (!box) {
        return <div>Caja no encontrada: {params.boxId}</div>
    }

    // Config comes from model.series_config which is JSONB (array of objects)
    const fields = Array.isArray(box.models.series_config) ? box.models.series_config : []

    return (
        <div className="p-8 max-w-4xl mx-auto bg-white min-h-screen text-black print:p-0 print:max-w-none">
            {/* Navigation - Hidden on Print */}
            <div className="mb-8 flex justify-between items-center print:hidden">
                <Button variant="outline" asChild>
                    <Link href={`/dashboard/dispatch/${box.id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Link>
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/dispatch/${box.id}/print-summary`}>
                            Ver Carátula
                        </Link>
                    </Button>
                    <PrintButton label="Imprimir" />
                </div>
            </div>

            {/* Header */}
            <div className="border-b-2 border-black pb-4 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wider">Documento Maestro</h1>

                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-mono font-bold">{box.box_number}</h2>
                        <div className="mt-1">
                            <Badge variant="outline" className="text-black border-black rounded-none px-2 py-0.5 uppercase">
                                {box.status}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 text-sm">
                <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold col-span-1">Marca:</span>
                    <span className="col-span-2">{box.models.brands.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold col-span-1">Modelo:</span>
                    <span className="col-span-2">{box.models.name}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold col-span-1">Fecha Cierre:</span>
                    <span className="col-span-2">
                        {box.closed_at ? new Date(box.closed_at).toLocaleString('es-MX') : '-'}
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold col-span-1">Responsable:</span>
                    <span className="col-span-2">{box.users?.email || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <span className="font-bold col-span-1">Total Equipos:</span>
                    <span className="col-span-2 font-bold">{box.items.length} / {box.total_items}</span>
                </div>
            </div>

            {/* Content Table */}
            <div className="mb-8">
                <h3 className="font-bold border-b border-black mb-2 pb-1 text-sm uppercase">Detalle de Contenido</h3>
                <Table className="w-full border-collapse text-xs">
                    <TableHeader>
                        <TableRow className="border-b border-black h-8 hover:bg-transparent">
                            <TableHead className="text-black font-bold h-8 w-12 text-left p-1">#</TableHead>

                            {fields.map((f: any) => (
                                <TableHead key={f.name} className="text-black font-bold h-8 text-left p-1">
                                    {f.name}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {box.items.map((item: any, i: number) => (
                            <TableRow key={item.id} className="border-b border-gray-200 h-8 hover:bg-transparent">
                                <TableCell className="p-1 font-mono">{i + 1}</TableCell>

                                {fields.map((f: any) => (
                                    <TableCell key={f.name} className="p-1 font-mono">
                                        {item.series_data[f.name]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>



            <div className="mt-8 text-center text-[10px] text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                Generado por Sistema G985 - {new Date().toLocaleString()}
            </div>
        </div>
    )
}
