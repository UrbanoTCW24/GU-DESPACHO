import { getBoxDetails } from '../actions'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PrintButton } from '@/components/print-button'
import { BarcodeGenerator } from '@/components/ui/barcode-generator'

export default async function PrintSummaryPage(props: { params: Promise<{ boxId: string }> }) {
    const params = await props.params;
    const box = await getBoxDetails(params.boxId)

    if (!box) {
        return <div>Caja no encontrada: {params.boxId}</div>
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center print:bg-white print:p-0">
            {/* Navigation - Hidden on Print */}
            <div className="w-full max-w-[210mm] mb-8 flex justify-between items-center print:hidden">
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

            {/* A4 Page Container */}
            <div
                className="bg-white text-black shadow-lg print:shadow-none print:w-[210mm] print:h-[297mm] w-[210mm] min-h-[297mm] flex flex-col justify-center items-center relative box-border mx-auto p-12"
                style={{ breakAfter: 'page' }}
            >
                {/* Border Container - Original Design */}
                <div className="border-4 border-black rounded-[2rem] p-12 flex flex-col items-center w-full max-w-2xl bg-white">

                    {/* Header: Etiqueta de Caja */}
                    <div className="text-center border-b-2 border-black pb-6 mb-8 w-full">
                        <h1 className="text-4xl font-bold uppercase tracking-wider mb-2">Etiqueta de Caja</h1>
                    </div>

                    <div className="flex-1 w-full space-y-10">
                        {/* Box Number Section */}
                        <div className="text-center space-y-4">
                            <p className="text-sm uppercase font-bold text-gray-500 tracking-widest">Número de Caja</p>

                            {/* Barcode */}
                            <div className="flex justify-center mb-2">
                                <BarcodeGenerator
                                    value={box.box_number || box.id}
                                    width={2}
                                    height={60}
                                    fontSize={16}
                                    displayValue={false} // Hide value in barcode since we show it below large
                                />
                            </div>

                            {/* Text Number */}
                            <h2 className="text-6xl font-mono font-bold tracking-tight text-black">{box.box_number}</h2>
                        </div>

                        {/* Brand / Model Grid */}
                        <div className="grid grid-cols-2 gap-8 text-center w-full mt-8">
                            <div>
                                <p className="text-sm uppercase font-bold text-gray-500 mb-2 tracking-widest">Marca</p>
                                <p className="text-3xl font-bold">{box.models.brands.name}</p>
                            </div>
                            <div>
                                <p className="text-sm uppercase font-bold text-gray-500 mb-2 tracking-widest">Modelo</p>
                                <p className="text-3xl font-bold">{box.models.name}</p>
                            </div>
                        </div>

                        {/* Count Section */}
                        <div className="text-center pt-8 mt-4 w-full">
                            <div className="border-t-2 border-dashed border-gray-300 w-full mb-8"></div>
                            <p className="text-sm uppercase font-bold text-gray-500 mb-2 tracking-widest">Cantidad Total</p>
                            <div className="inline-flex items-baseline justify-center">
                                <span className="text-[6rem] leading-none font-bold mr-3">{box.items.length}</span>
                                <span className="text-2xl text-gray-500 font-medium">equipos</span>
                            </div>
                        </div>

                        {/* Footer / Date */}
                        <div className="text-center pt-8 w-full">
                            <div className="border-t-2 border-dashed border-gray-300 w-full mb-6"></div>
                            <p className="text-xs uppercase font-bold text-gray-500 mb-1">Fecha de Impresión</p>
                            <p className="text-xl font-medium">
                                {new Date().toLocaleDateString('es-MX', {
                                    year: 'numeric',
                                    month: 'numeric',
                                    day: 'numeric'
                                })}
                            </p>
                            <p className="text-sm text-gray-400">
                                {new Date().toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
