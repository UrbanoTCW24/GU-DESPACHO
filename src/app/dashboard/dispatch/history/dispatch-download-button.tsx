'use client'

import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { getDispatchReportData } from './actions'
import { toast } from 'sonner'

export function DispatchDownloadButton({ dispatchId, sapId }: { dispatchId: string, sapId: string }) {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any[] | null = await getDispatchReportData(dispatchId)

            if (!data || data.length === 0) {
                toast.error('No se encontraron datos para este despacho')
                return
            }

            // Generate Excel
            const worksheet = XLSX.utils.json_to_sheet(data)

            // Adjust widths
            const colWidths = [
                { wch: 15 }, // SAP ID
                { wch: 20 }, // Fecha
                { wch: 10 }, // Tipo
                { wch: 15 }, // Caja
                { wch: 15 }, // Marca
                { wch: 20 }, // Modelo
                { wch: 15 }, // Material
                { wch: 20 }, // Serie
                { wch: 25 }, // Series Add
                { wch: 20 }, // Usuario
                { wch: 10 }, // Estado
            ]
            worksheet['!cols'] = colWidths

            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Despacho")

            XLSX.writeFile(workbook, `Despacho_${sapId}_${new Date().toISOString().split('T')[0]}.xlsx`)
            toast.success('Reporte descargado')

        } catch (error) {
            console.error(error)
            toast.error('Error al generar el reporte')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading} className="gap-2">
            <Loader2 className={`h-4 w-4 animate-spin ${loading ? '' : 'hidden'}`} />
            <Download className={`h-4 w-4 ${loading ? 'hidden' : ''}`} />
            Excel
        </Button>
    )
}
