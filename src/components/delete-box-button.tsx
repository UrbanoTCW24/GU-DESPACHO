'use client'

import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteBox } from '@/app/dashboard/actions-shared'
import { toast } from 'sonner'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteBoxButtonProps {
    boxId: string
    boxNumber: string
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
    iconOnly?: boolean
}

export function DeleteBoxButton({ boxId, boxNumber, variant = "destructive", size = "default", iconOnly = false }: DeleteBoxButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm(`PELIGRO: ¿Estás seguro de eliminar la CAJA ${boxNumber} y TODO su contenido?\n\nEsta acción NO se puede deshacer.`)) return;

        setLoading(true)
        const result = await deleteBox(boxId)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(`Caja ${boxNumber} eliminada correctamente`)
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <Button variant={variant} size={size} onClick={handleDelete} disabled={loading} title="Eliminar caja">
            <Loader2 className={`h-4 w-4 animate-spin ${loading ? '' : 'hidden'}`} />
            <Trash2 className={`h-4 w-4 ${loading ? 'hidden' : ''}`} />
            <span className={`ml-2 ${iconOnly ? 'hidden' : ''}`}>Eliminar</span>
        </Button>
    )
}
