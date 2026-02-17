'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBox } from './actions'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function NewBoxForm({ models }: { models: any[] }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [selectedModel, setSelectedModel] = useState('')
    const [itemCount, setItemCount] = useState<number | string>(10)

    const handleCreate = async () => {
        if (!selectedModel) {
            toast.error("Error", { description: "Selecciona un modelo." })
            return
        }

        setLoading(true)
        const result = await createBox(selectedModel, Number(itemCount) || 0)

        if (result.error) {
            toast.error("Error", { description: result.error })
            setLoading(false)
        } else {
            toast.success("Caja creada", { description: "Redirigiendo a la zona de despacho..." })
            router.push(`/dashboard/dispatch/${result.boxId}`)
        }
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Iniciar Nueva Caja</CardTitle>
                <CardDescription>Configura los detalles para comenzar el despacho.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Modelo a Despachar</Label>
                    <Select onValueChange={setSelectedModel} value={selectedModel}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar modelo" />
                        </SelectTrigger>
                        <SelectContent>
                            {models.map(model => (
                                <SelectItem key={model.id} value={model.id}>
                                    {model.brands.name} - {model.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Cantidad de Equipos</Label>
                    <Input
                        type="number"
                        min={1}
                        value={itemCount}
                        onChange={(e) => setItemCount(e.target.value)}
                    />
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Caja y Comenzar'}
                </Button>
            </CardContent>
        </Card>
    )
}
