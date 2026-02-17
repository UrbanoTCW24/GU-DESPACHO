'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { getGeneralReport } from './actions'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

export function DownloadReportButton() {
    const downloadRef = useRef<HTMLAnchorElement>(null)
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            // Fetch all data
            const data = await getGeneralReport(1000)

            if (!data || data.length === 0) {
                alert('No hay datos para exportar')
                setLoading(false)
                return
            }

            // Map data to flat structure for Excel
            const excelRows = data.map((item: any) => {
                const seriesValues = Object.values(item.series_data || {})
                const primarySeries = seriesValues[0] as string || ''
                const secondarySeries = seriesValues[1] as string || ''
                const otherSeries = seriesValues.slice(2).join(' | ')

                return {
                    'Fecha de Registro': new Date(item.scanned_at).toLocaleString('es-MX'),
                    'Caja': item.boxes?.box_number || '',
                    'Marca': item.boxes?.models?.brands?.name || '',
                    'Modelo': item.boxes?.models?.name || '',
                    'Material': item.boxes?.models?.name || '', // Using model name as material per previous logic
                    'Serie Principal (SAP)': primarySeries,
                    'Serie Secundaria': secondarySeries,
                    'Otras Series': otherSeries,
                    'Usuario': item.users?.email || '',
                    'Estado Validación': item.is_sap_validated ? 'VALIDADO OK' : 'MANUAL'
                }
            })

            // Create Worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelRows)

            // Adjust column widths (auto width based on headers approx)
            const wscols = [
                { wch: 20 }, // Fecha
                { wch: 20 }, // Caja
                { wch: 15 }, // Marca
                { wch: 25 }, // Modelo
                { wch: 25 }, // Material
                { wch: 25 }, // Serie 1
                { wch: 20 }, // Serie 2
                { wch: 20 }, // Otras
                { wch: 30 }, // Usuario
                { wch: 15 }  // Estado
            ]
            worksheet['!cols'] = wscols

            // Create Workbook
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte General")

            // Generate buffer manually
            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
            const blob = new Blob([wbout], { type: 'application/octet-stream' })
            const url = URL.createObjectURL(blob)

            // Use React-controlled anchor
            if (downloadRef.current) {
                downloadRef.current.href = url
                downloadRef.current.download = `Reporte_General_${new Date().toISOString().split('T')[0]}.xlsx`
                downloadRef.current.click()

                // Cleanup URL after a delay
                setTimeout(() => {
                    window.URL.revokeObjectURL(url)
                }, 1000)
            }

        } catch (error) {
            console.error('Error exporting:', error)
            alert('Error al generar el Excel')
        }
        setLoading(false)
    }

    return (
        <>
            <Button onClick={handleDownload} disabled={loading} variant="outline" className="gap-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200">
                <Download className="h-4 w-4" />
                {loading ? 'Generando...' : 'Descargar Excel (.xlsx)'}
            </Button>
            <a ref={downloadRef} className="hidden" />
        </>
    )
}
