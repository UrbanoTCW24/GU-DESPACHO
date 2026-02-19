'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Download, Filter } from 'lucide-react'
import { getFilterOptions, getGlobalSeriesReport } from './actions'
import * as XLSX from 'xlsx'

export function GlobalReportDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingOptions, setLoadingOptions] = useState(false)
    const [options, setOptions] = useState<{
        brands: { id: string, name: string }[]
        models: { id: string, name: string, brand_id: string }[]
        materials: string[]
    }>({ brands: [], models: [], materials: [] })

    const [selectedBrand, setSelectedBrand] = useState<string>('all')
    const [selectedModel, setSelectedModel] = useState<string>('all')
    const [selectedMaterial, setSelectedMaterial] = useState<string>('all')

    const downloadRef = useRef<HTMLAnchorElement>(null)

    useEffect(() => {
        if (open) {
            setLoadingOptions(true)
            getFilterOptions()
                .then(data => {
                    setOptions({
                        brands: data.brands || [],
                        models: data.models || [],
                        materials: data.materials || []
                    })
                    setLoadingOptions(false)
                })
                .catch(err => {
                    console.error('Error loading options', err)
                    setLoadingOptions(false)
                })
        }
    }, [open])

    // Filter models based on selected brand
    const filteredModels = (selectedBrand && selectedBrand !== 'all')
        ? (options.models || []).filter(m => m.brand_id === selectedBrand)
        : (options.models || [])

    const handleDownload = async () => {
        setLoading(true)
        try {
            const filters = {
                brand: selectedBrand !== 'all' ? options.brands.find(b => b.id === selectedBrand)?.name : undefined,
                model: selectedModel !== 'all' ? options.models.find(m => m.id === selectedModel)?.name : undefined,
                material: selectedMaterial !== 'all' ? selectedMaterial : undefined
            }

            const data = await getGlobalSeriesReport(filters)

            if (!data || data.length === 0) {
                alert('No se encontraron registros con los filtros seleccionados.')
                setLoading(false)
                return
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const excelRows = data.map((item: any) => ({
                'Fecha de Registro': new Date(item.created_at).toLocaleString('es-MX'),
                'Serie': item.series,
                'Caja': item.boxes?.box_number || '',
                'Marca': item.boxes?.models?.brands?.name || '',
                'Modelo': item.boxes?.models?.name || '',
                'Material': item.equipment?.material || '',
                'Usuario': item.equipment?.users?.name || item.equipment?.users?.email || ''
            }))

            generateExcel(excelRows, 'Reporte_Global_Series', [
                { wch: 20 }, // Fecha
                { wch: 25 }, // Serie
                { wch: 15 }, // Caja
                { wch: 15 }, // Marca
                { wch: 20 }, // Modelo
                { wch: 20 }, // Material
                { wch: 30 }, // Usuario
            ])
            setOpen(false)

        } catch (error) {
            console.error('Error exporting global:', error)
            alert('Error al generar el Excel Global')
        }
        setLoading(false)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateExcel = (rows: any[], fileNamePrefix: string, colWidths: any[]) => {
        const worksheet = XLSX.utils.json_to_sheet(rows)
        worksheet['!cols'] = colWidths
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte")
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([wbout], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        if (downloadRef.current) {
            downloadRef.current.href = url
            downloadRef.current.download = `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`
            downloadRef.current.click()
            setTimeout(() => {
                window.URL.revokeObjectURL(url)
            }, 1000)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200">
                    <Download className="h-4 w-4" />
                    Reporte Global Series (.xlsx)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Descargar Reporte Global</DialogTitle>
                    <DialogDescription>
                        Selecciona filtros opcionales para el reporte de series.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {loadingOptions ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">Cargando opciones...</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="brand" className="text-right">
                                    Marca
                                </Label>
                                <Select value={selectedBrand} onValueChange={(val) => {
                                    setSelectedBrand(val)
                                    setSelectedModel('all') // Reset model when brand changes
                                }}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Todas las marcas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las marcas</SelectItem>
                                        {options.brands.map(brand => (
                                            <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="model" className="text-right">
                                    Modelo
                                </Label>
                                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={selectedBrand === 'all' && filteredModels.length > 100}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Todos los modelos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los modelos</SelectItem>
                                        {filteredModels.map(model => (
                                            <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="material" className="text-right">
                                    Material
                                </Label>
                                <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Todos los materiales" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los materiales</SelectItem>
                                        {options.materials.map(mat => (
                                            <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <a ref={downloadRef} className="hidden" />
                    <Button onClick={handleDownload} disabled={loading || loadingOptions} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? 'Generando...' : 'Descargar Excel'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
