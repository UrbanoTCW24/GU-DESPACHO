'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { updateBox } from './actions'
import { useRouter } from 'next/navigation'

interface EditBoxDialogProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    box: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    models: any[]
}

export function EditBoxDialog({ box, models }: EditBoxDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selectedModel, setSelectedModel] = useState(box.model_id)
    const [totalItems, setTotalItems] = useState(box.total_items)
    const router = useRouter()

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const result = await updateBox(box.id, selectedModel, Number(totalItems))

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Caja actualizada')
            setOpen(false)
            router.refresh()
        }
        setLoading(false)
    }

    // Filter models by brand if needed, or just show all with Brand - Model name
    // For simplicity, showing all models grouped by brand logic visually in text

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50" title="Editar Caja">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Caja {box.box_number}</DialogTitle>
                    <DialogDescription>
                        Modifica el modelo o la cantidad esperada de equipos.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdate} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="model" className="text-right">
                            Modelo
                        </Label>
                        <div className="col-span-3">
                            <Select value={selectedModel} onValueChange={setSelectedModel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar Modelo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {models.map((model) => (
                                        <SelectItem key={model.id} value={model.id}>
                                            {model.brands?.name} - {model.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                            Cantidad
                        </Label>
                        <Input
                            id="quantity"
                            type="number"
                            value={totalItems}
                            onChange={(e) => setTotalItems(e.target.value)}
                            className="col-span-3"
                            min={1}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
