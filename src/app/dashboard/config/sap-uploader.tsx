'use client'

import { useState, useEffect } from 'react'
import { uploadSAPData, clearSAPData, getSAPRecordCount } from './sap-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Upload, Trash2, Database } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function SAPUploader() {
    const [loading, setLoading] = useState(false)
    const [recordCount, setRecordCount] = useState<number | null>(null)

    const fetchCount = async () => {
        const result = await getSAPRecordCount()
        if (result && typeof result.count === 'number') {
            setRecordCount(result.count)
        }
    }

    useEffect(() => {
        fetchCount()
    }, [])

    const handleUpload = async (formData: FormData) => {
        setLoading(true)
        const result = await uploadSAPData(formData)
        setLoading(false)

        if (result.error) {
            toast.error("Error al cargar", { description: result.error })
        } else {
            toast.success("Carga Exitosa", { description: `Se importaron ${result.count} registros.` })
            // clear input
            const form = document.querySelector('#sap-upload-form') as HTMLFormElement
            if (form) form.reset()
            fetchCount()
        }
    }

    const handleClear = async () => {
        if (!confirm('¿Estás seguro de borrar toda la data SAP? Esto afectará las validaciones.')) return;
        setLoading(true)
        const result = await clearSAPData()
        setLoading(false)
        if (result.error) {
            toast.error("Error", { description: result.error })
        } else {
            toast.success("Data eliminada", { description: "La base de datos SAP ha sido limpiada." })
            fetchCount()
        }
    }

    const handleDownloadTemplate = () => {
        const headers = ['Serie', 'Material', 'Estado (Opcional)']
        const rows = [
            ['S123456789', 'MAT-001', 'disponible'],
            ['S987654321', 'MAT-002', 'pendiente']
        ]

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'plantilla_carga_sap.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Carga de Data SAP
                            {recordCount !== null && (
                                <Badge variant="secondary" className="text-xs font-normal">
                                    <Database className="h-3 w-3 mr-1" />
                                    {recordCount.toLocaleString()} registros
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Sube un archivo Excel (.xlsx, .xls) o CSV con las series válidas. <br />
                            Estructura: <strong>Serie</strong> (Requerido), <strong>Material</strong> (Requerido), <strong>Estado</strong> (Opcional).
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                        <Upload className="h-4 w-4 mr-2" />
                        Descargar Plantilla
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <form id="sap-upload-form" action={handleUpload} className="flex gap-2 items-center">
                    <Input name="file" type="file" accept=".csv,.txt,.xlsx,.xls" required disabled={loading} />
                    <Button type="submit" disabled={loading}>
                        <Upload className="h-4 w-4 mr-2" />
                        {loading ? 'Cargando...' : 'Subir'}
                    </Button>
                </form>
                <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleClear} disabled={loading}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpiar Base de Datos SAP
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
