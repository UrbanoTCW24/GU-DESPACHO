'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteBox } from './actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function DeleteBoxButton({ boxId, boxNumber }: { boxId: string, boxNumber: string }) {
    const router = useRouter()

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault() // Link prevention
        if (!confirm(`¿Estás seguro de ELIMINAR la caja ${boxNumber}? Esta acción no se puede deshacer.`)) return

        const result = await deleteBox(boxId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Caja eliminada")
            router.refresh()
        }
    }

    return (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleDelete} title="Eliminar Caja">
            <Trash2 className="h-4 w-4" />
        </Button>
    )
}
