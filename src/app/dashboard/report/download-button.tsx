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
            const data = await getGeneralReport(0)

            if (!data || data.length === 0) {
                alert('No hay datos para exportar')
                setLoading(false)
                return
            }

            // Calculate max number of series to generate dynamic columns
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const maxSeriesCount = data.reduce((max: number, item: any) => {
                const count = Object.keys(item.series_data || {}).length
                return count > max ? count : max
            }, 0)

            // Map data to flat structure for Excel
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const excelRows = data.map((item: any) => {
                const seriesValues = Object.values(item.series_data || {}) as string[]

                // Base row data
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const row: any = {
                    'Fecha de Registro': new Date(item.scanned_at).toLocaleString('es-MX'),
                    'Caja': item.boxes?.box_number || '',
                    'Marca': item.boxes?.models?.brands?.name || '',
                    'Modelo': item.boxes?.models?.name || '',
                    'Material': item.material || '', // Correctly mapping actual material field
                }

                // Dynamic Series Columns
                for (let i = 0; i < maxSeriesCount; i++) {
                    row[`Serie ${i + 1}`] = seriesValues[i] || ''
                }

                // Append remaining static columns
                row['Usuario'] = item.users?.name || item.users?.email || ''
                row['Estado Validación'] = item.is_sap_validated ? 'VALIDADO OK' : 'MANUAL'

                return row
            })

            // Create Worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelRows)

            // Adjust column widths (auto width based on headers approx)
            const wscols = [
                { wch: 20 }, // Fecha
                { wch: 15 }, // Caja
                { wch: 15 }, // Marca
                { wch: 20 }, // Modelo
                { wch: 20 }, // Material
            ]

            // Add width for dynamic series columns
            for (let i = 0; i < maxSeriesCount; i++) {
                wscols.push({ wch: 25 })
            }

            // Add widths for final duplicate static columns if any (Usuario, Estado)
            wscols.push({ wch: 30 }) // Usuario
            wscols.push({ wch: 15 }) // Estado
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
