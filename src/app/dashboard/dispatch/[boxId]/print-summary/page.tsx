import { getBoxDetails } from '../actions'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PrintButton } from '@/components/print-button'

export default async function PrintSummaryPage(props: { params: Promise<{ boxId: string }> }) {
    const params = await props.params;
    const box = await getBoxDetails(params.boxId)

    if (!box) {
        return <div>Caja no encontrada: {params.boxId}</div>
    }

    return (
        <div className="p-8 max-w-2xl mx-auto bg-white min-h-screen text-black print:p-0 print:max-w-none flex flex-col justify-center">
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
                        <Link href={`/dashboard/dispatch/${box.id}/print`}>
                            Ver Detalle Completo
                        </Link>
                    </Button>
                    <PrintButton label="Imprimir Etiqueta" />
                </div>
            </div>

            <div className="border-4 border-black p-8 rounded-lg">
                <div className="text-center border-b-2 border-black pb-6 mb-6">
                    <h1 className="text-4xl font-bold uppercase tracking-wider mb-2">Etiqueta de Caja</h1>
                </div>

                <div className="space-y-8">
                    <div className="text-center">
                        <p className="text-sm uppercase font-bold text-gray-500 mb-1">Número de Caja</p>
                        <h2 className="text-6xl font-mono font-bold tracking-tight">{box.box_number}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-8 text-center">
                        <div>
                            <p className="text-sm uppercase font-bold text-gray-500 mb-1">Marca</p>
                            <p className="text-2xl font-bold">{box.models.brands.name}</p>
                        </div>
                        <div>
                            <p className="text-sm uppercase font-bold text-gray-500 mb-1">Modelo</p>
                            <p className="text-2xl font-bold">{box.models.name}</p>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-sm uppercase font-bold text-gray-500 mb-1">Cantidad Total</p>
                        <div className="inline-flex items-baseline justify-center">
                            <span className="text-5xl font-bold mr-2">{box.items.length}</span>
                            <span className="text-xl text-gray-500">equipos</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 border-t-2 border-dashed border-gray-300 pt-6">
                        <div className="text-center">
                            <p className="text-xs uppercase font-bold text-gray-500">Fecha de Impresión</p>
                            <p className="text-lg">{new Date().toLocaleDateString('es-MX')}</p>
                            <p className="text-xs text-gray-400">{new Date().toLocaleTimeString('es-MX')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center text-[10px] text-gray-400 print:fixed print:bottom-4 print:left-0 print:w-full">
                Generado por Sistema G985 - {new Date().toLocaleString()}
            </div>
        </div>
    )
}
