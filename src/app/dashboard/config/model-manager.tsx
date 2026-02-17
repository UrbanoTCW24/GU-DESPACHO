/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { createModel, deleteModel, updateModel } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, X, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'

interface SeriesField {
    id: string
    name: string
    required: boolean
    length?: number
}

export function ModelManager({ brands, models }: { brands: any[], models: any[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedBrand, setSelectedBrand] = useState<string>('')
    const [modelName, setModelName] = useState('')
    const [seriesFields, setSeriesFields] = useState<SeriesField[]>([{ id: '1', name: 'Serie Principal', required: true }])
    const [editingId, setEditingId] = useState<string | null>(null)

    const addField = () => {
        if (seriesFields.length >= 4) return;
        setSeriesFields([...seriesFields, { id: Math.random().toString(), name: `Serie ${seriesFields.length + 1}`, required: false }])
    }

    const removeField = (id: string) => {
        if (seriesFields.length <= 1) return; // Minimum 1 field
        setSeriesFields(seriesFields.filter(f => f.id !== id))
    }

    const updateField = (id: string, key: keyof SeriesField, value: any) => {
        setSeriesFields(seriesFields.map(f => f.id === id ? { ...f, [key]: value } : f))
    }

    const handleOpenDialog = (model?: any) => {
        if (model) {
            setEditingId(model.id)
            setSelectedBrand(model.brand_id)
            setModelName(model.name)
            const fields = (model.series_config as any[]).map((f, i) => ({
                id: i.toString(),
                name: f.name,
                required: f.required,
                length: f.length
            }))
            setSeriesFields(fields)
        } else {
            setEditingId(null)
            setSelectedBrand('')
            setModelName('')
            setSeriesFields([{ id: '1', name: 'Serie Principal', required: true }])
        }
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!selectedBrand || !modelName) {
            toast.error("Error", { description: "Selecciona una marca y nombre de modelo" })
            return
        }

        // Sanitize fields: remove internal IDs and ensure types
        const cleanFields = seriesFields.map(f => ({
            name: f.name,
            required: f.required,
            length: f.length ? Number(f.length) : null
        }))

        let result;
        if (editingId) {
            result = await updateModel(editingId, selectedBrand, modelName, cleanFields)
        } else {
            result = await createModel(selectedBrand, modelName, cleanFields)
        }

        if (result.error) {
            toast.error("Error", { description: result.error })
        } else {
            toast.success(editingId ? "Modelo actualizado" : "Modelo creado", {
                description: editingId ? "Los cambios han sido guardados." : "El modelo ha sido configurado exitosamente."
            })
            setIsDialogOpen(false)
            setEditingId(null)
            setModelName('')
            setSeriesFields([{ id: '1', name: 'Serie Principal', required: true }])
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro? Se eliminarán todas las cajas asociadas.')) return;
        const result = await deleteModel(id)
        if (result.error) {
            toast.error("Error", { description: result.error })
        } else {
            toast.success("Modelo eliminado", { description: "El modelo ha sido eliminado." })
        }
    }

    return (
        <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Modelos y Configuración</CardTitle>
                    <CardDescription>Define modelos y sus series requeridas (hasta 4).</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog()}>Nuevo Modelo</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Modelo' : 'Configurar Nuevo Modelo'}</DialogTitle>
                            <DialogDescription>
                                {editingId ? 'Modifica la marca, nombre y campos.' : 'Define la marca, nombre y los campos de serie que se solicitarán.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Marca</Label>
                                <Select onValueChange={setSelectedBrand} value={selectedBrand}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Seleccionar marca" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Modelo</Label>
                                <Input
                                    value={modelName}
                                    onChange={(e) => setModelName(e.target.value)}
                                    className="col-span-3"
                                    placeholder="Ej: G985"
                                />
                            </div>

                            <div className="border-t pt-4 mt-2">
                                <div className="flex justify-between items-center mb-2">
                                    <Label className="font-semibold">Campos de Serie ({seriesFields.length}/4)</Label>
                                    {seriesFields.length < 4 && (
                                        <Button type="button" variant="outline" size="sm" onClick={addField}>
                                            <Plus className="h-3 w-3 mr-1" /> Agregar
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {seriesFields.map((field, index) => (
                                        <div key={field.id} className="flex gap-2 items-center">
                                            <Input
                                                value={field.name}
                                                onChange={(e) => updateField(field.id, 'name', e.target.value)}
                                                placeholder="Nombre del campo"
                                                className="h-8 flex-1"
                                            />
                                            <Input
                                                type="number"
                                                value={field.length || ''}
                                                onChange={(e) => updateField(field.id, 'length', parseInt(e.target.value) || undefined)}
                                                placeholder="Longitud (Opcel)"
                                                className="h-8 w-24"
                                                title="Cantidad de caracteres para auto-salto"
                                            />
                                            <div className="flex items-center space-x-2 w-24">
                                                <Checkbox
                                                    id={`req-${field.id}`}
                                                    checked={field.required}
                                                    onCheckedChange={(c) => updateField(field.id, 'required', c)}
                                                />
                                                <label htmlFor={`req-${field.id}`} className="text-xs">Requerido</label>
                                            </div>
                                            {index > 0 && (
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeField(field.id)}>
                                                    <X className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSave}>{editingId ? 'Actualizar Modelo' : 'Guardar Configuración'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {models.map(model => (
                        <div key={model.id} className="flex items-start justify-between p-4 border rounded-lg">
                            <div>
                                <h4 className="font-bold flex items-center gap-2">
                                    {model.name}
                                    <span className="text-xs font-normal bg-muted px-2 py-1 rounded text-muted-foreground">
                                        {model.brands?.name}
                                    </span>
                                </h4>
                                <div className="mt-2 flex gap-2">
                                    {(model.series_config as any[]).map((conf, i) => (
                                        <span key={i} className={`text-xs px-2 py-0.5 rounded border ${conf.required ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                            {conf.name} {conf.required && '*'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(model)}>
                                    <Pencil className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(model.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {models.length === 0 && <p className="text-muted-foreground text-sm">No hay modelos configurados.</p>}
                </div>
            </CardContent>
        </Card>
    )
}
