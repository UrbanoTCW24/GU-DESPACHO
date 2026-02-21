'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { getPalletReportData } from './pallet-actions'
import { toast } from 'sonner'

export function PalletDownloadButton({
    palletId,
    palletName,
}: {
    palletId: string
    palletName: string
}) {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            const result = await getPalletReportData(palletId)
            if (!result || result.rows.length === 0) {
                toast.error('No hay datos para descargar')
                return
            }

            const { rows, sapExitId } = result

            // ── Sheet 1: Detail per series ──────────────────────────────────
            const wsDetail = XLSX.utils.json_to_sheet(rows)
            wsDetail['!cols'] = [
                { wch: 14 }, // Tarima
                { wch: 16 }, // SAP ID
                { wch: 14 }, // Caja
                { wch: 14 }, // Marca
                { wch: 20 }, // Modelo
                { wch: 14 }, // Material
                { wch: 22 }, // Serie Principal
                { wch: 26 }, // Series Adicionales
                { wch: 20 }, // Usuario
                { wch: 12 }, // Estado SAP
                { wch: 22 }, // Fecha Despacho
            ]

            // ── Sheet 2: Summary per box ─────────────────────────────────────
            const summaryMap = new Map<string, { tarima: string; caja: string; total: number }>()
            for (const row of rows) {
                const key = `${row['Tarima']}|${row['Caja']}`
                if (!summaryMap.has(key)) {
                    summaryMap.set(key, { tarima: row['Tarima'], caja: row['Caja'], total: 0 })
                }
                summaryMap.get(key)!.total += 1
            }

            const summaryRows = Array.from(summaryMap.values()).map(r => ({
                'Tarima': r.tarima,
                'ID Salida SAP': sapExitId || 'PENDIENTE',
                'Número de Caja': r.caja,
                'Total Series': r.total,
                'Fecha Despacho': rows[0]?.['Fecha Despacho'] || '-',
            }))

            const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
            wsSummary['!cols'] = [
                { wch: 14 }, // Tarima
                { wch: 16 }, // SAP ID
                { wch: 16 }, // Caja
                { wch: 14 }, // Total Series
                { wch: 22 }, // Fecha
            ]

            // ── Workbook ─────────────────────────────────────────────────────
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle de Series')
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Caja')

            const fileName = `Tarima_${palletName}_${sapExitId || 'PENDIENTE'}_${new Date().toISOString().split('T')[0]}.xlsx`
            XLSX.writeFile(wb, fileName)
            toast.success('Reporte descargado')
        } catch (err) {
            console.error(err)
            toast.error('Error al generar el reporte')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={loading} className="gap-2">
            <Loader2 className={`h-4 w-4 animate-spin ${loading ? '' : 'hidden'}`} />
            <Download className={`h-4 w-4 ${loading ? 'hidden' : ''}`} />
            Reporte
        </Button>
    )
}
