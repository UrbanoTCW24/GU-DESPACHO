'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { getGeneralReport } from './actions'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { GlobalReportDialog } from './global-report-dialog'

export function DownloadReportButton() {
    const downloadRef = useRef<HTMLAnchorElement>(null)
    const [loadingGeneral, setLoadingGeneral] = useState(false)

    const handleDownloadGeneral = async () => {
        setLoadingGeneral(true)
        try {
            // Fetch all data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result: any = await getGeneralReport(0)
            const data = Array.isArray(result) ? result : result.data

            if (!data || data.length === 0) {
                alert('No hay datos para exportar')
                setLoadingGeneral(false)
                return
            }

            // Map data to flat structure for Excel
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const excelRows = data.map((item: any) => {
                const seriesValues = Object.values(item.series_data || {}) as string[]
                const primarySeries = seriesValues[0] || '-'
                const additionalSeries = seriesValues.slice(1).join(', ')

                return {
                    'Fecha de Registro': new Date(item.scanned_at).toLocaleString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                    }),
                    'Caja': item.boxes?.box_number || '',
                    'Marca': item.boxes?.models?.brands?.name || '',
                    'Modelo': item.boxes?.models?.name || '',
                    'Material': item.material || '',
                    'Serie SAP / Principal': primarySeries,
                    'Series Adicionales': additionalSeries,
                    'Usuario': item.users?.name || item.users?.email || '',
                    'Estado Validación': item.is_sap_validated ? 'VALIDADO OK' : 'MANUAL'
                }
            })

            generateExcel(excelRows, 'Reporte_General', [
                { wch: 20 }, // Fecha
                { wch: 15 }, // Caja
                { wch: 15 }, // Marca
                { wch: 20 }, // Modelo
                { wch: 20 }, // Material
                { wch: 25 }, // Serie SAP / Principal
                { wch: 30 }, // Series Adicionales
                { wch: 25 }, // Usuario
                { wch: 15 }, // Estado
            ])

        } catch (error) {
            console.error('Error exporting:', error)
            alert('Error al generar el Excel')
        }
        setLoadingGeneral(false)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateExcel = (rows: any[], fileNamePrefix: string, colWidths: any[]) => {
        // Create Worksheet
        const worksheet = XLSX.utils.json_to_sheet(rows)

        // Adjust column widths
        worksheet['!cols'] = colWidths

        // Create Workbook
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte")

        // Generate buffer manually
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([wbout], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)

        // Use React-controlled anchor
        if (downloadRef.current) {
            downloadRef.current.href = url
            downloadRef.current.download = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`
            downloadRef.current.click()

            // Cleanup URL after a delay
            setTimeout(() => {
                window.URL.revokeObjectURL(url)
            }, 1000)
        }
    }

    return (
        <div className="flex gap-2">
            <Button onClick={handleDownloadGeneral} disabled={loadingGeneral} variant="outline" className="gap-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200">
                <Download className="h-4 w-4" />
                {loadingGeneral ? 'Generando...' : 'Reporte General (.xlsx)'}
            </Button>

            <GlobalReportDialog />

            <a ref={downloadRef} className="hidden" />
        </div>
    )
}
