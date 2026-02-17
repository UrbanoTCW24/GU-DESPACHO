'use client'

import { useState } from 'react'
import { createBrand, deleteBrand } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function BrandManager({ brands }: { brands: any[] }) {
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        const result = await createBrand(formData)
        setLoading(false)
        if (result.error) {
            toast.error("Error", { description: result.error })
        } else {
            toast.success("Marca creada", { description: "La marca ha sido agregada." })
            // Reset form
            const form = document.querySelector('form') as HTMLFormElement
            form.reset()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta marca? Se eliminarán todos sus modelos.')) return;
        const result = await deleteBrand(id)
        if (result.error) {
            toast.error("Error", { description: result.error })
        } else {
            toast.success("Marca eliminada", { description: "La marca ha sido eliminada." })
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Marcas</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="flex gap-2 mb-6">
                    <Input name="name" placeholder="Nueva Marca" required />
                    <Button type="submit" disabled={loading}>Agregar</Button>
                </form>
                <div className="space-y-2">
                    {brands.map((brand) => (
                        <div key={brand.id} className="flex items-center justify-between p-2 border rounded">
                            <span>{brand.name}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(brand.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    ))}
                    {brands.length === 0 && <p className="text-muted-foreground text-sm">No hay marcas registradas.</p>}
                </div>
            </CardContent>
        </Card>
    )
}
