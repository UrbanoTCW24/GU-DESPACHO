'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface FilterOptions {
    brands: { id: string, name: string }[]
    models: { id: string, name: string, brand_id: string }[]
    materials: string[]
}

export function ReportFilters({ options }: { options: FilterOptions }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [selectedBrand, setSelectedBrand] = useState<string>(searchParams.get('brand') || 'all')
    const [selectedModel, setSelectedModel] = useState<string>(searchParams.get('model') || 'all')
    const [selectedMaterial, setSelectedMaterial] = useState<string>(searchParams.get('material') || 'all')

    // Filter models based on selected brand
    const filteredModels = (selectedBrand && selectedBrand !== 'all')
        ? (options.models || []).filter(m => m.brand_id === selectedBrand)
        : (options.models || [])

    const updateFilters = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams)
        if (value && value !== 'all') {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        // Reset page to 1 when filtering
        params.set('page', '1')
        router.push(`?${params.toString()}`)
    }

    const handleBrandChange = (val: string) => {
        setSelectedBrand(val)
        setSelectedModel('all') // Reset model in UI

        const params = new URLSearchParams(searchParams)
        if (val !== 'all') params.set('brand', val); else params.delete('brand')
        params.delete('model')
        params.set('page', '1')
        router.push(`?${params.toString()}`)
    }

    const clearFilters = () => {
        setSelectedBrand('all')
        setSelectedModel('all')
        setSelectedMaterial('all')
        router.push('?')
    }

    // Sync state with URL params on navigation
    useEffect(() => {
        setSelectedBrand(searchParams.get('brand') || 'all')
        setSelectedModel(searchParams.get('model') || 'all')
        setSelectedMaterial(searchParams.get('material') || 'all')
    }, [searchParams])


    return (
        <div className="flex flex-wrap gap-4 items-end bg-slate-50 p-4 rounded-md border text-black">
            <div className="grid gap-2 min-w-[200px]">
                <Label htmlFor="brand">Marca</Label>
                <Select value={selectedBrand} onValueChange={handleBrandChange}>
                    <SelectTrigger>
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

            <div className="grid gap-2 min-w-[200px]">
                <Label htmlFor="model">Modelo</Label>
                <Select
                    value={selectedModel}
                    onValueChange={(val) => {
                        setSelectedModel(val)
                        updateFilters('model', val)
                    }}
                    disabled={selectedBrand === 'all' && filteredModels.length > 0} // Enabled if brand selected
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Todos los modelos" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los modelos</SelectItem>
                        {filteredModels.map(model => (
                            <SelectItem key={model.id} value={model.name}>{model.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2 min-w-[200px]">
                <Label htmlFor="material">Material</Label>
                <Select value={selectedMaterial} onValueChange={(val) => {
                    setSelectedMaterial(val)
                    updateFilters('material', val)
                }}>
                    <SelectTrigger>
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

            {(selectedBrand !== 'all' || selectedModel !== 'all' || selectedMaterial !== 'all') && (
                <Button variant="ghost" onClick={clearFilters} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <X className="h-4 w-4 mr-2" />
                    Limpiar filtros
                </Button>
            )}
        </div>
    )
}
