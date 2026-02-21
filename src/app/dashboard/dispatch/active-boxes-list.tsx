'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckSquare, Square } from 'lucide-react'
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
import { EditBoxDialog } from './edit-box-dialog'
import { DeleteBoxButton } from './delete-box-button'
import { DispatchDialog } from './dispatch-dialog'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ActiveBoxesListProps {
    boxes: any[]
    models: any[]
    isAdmin: boolean
    mode: 'packing' | 'shipping'
}

export function ActiveBoxesList({ boxes, models, isAdmin, mode }: ActiveBoxesListProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const router = useRouter()
    const [scanInput, setScanInput] = useState('')

    const toggleSelection = (id: string) => {
        if (mode === 'packing') return // Disable selection in packing mode
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        )
    }

    const toggleAll = () => {
        if (mode === 'packing') return
        if (selectedIds.length === boxes.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(boxes.map(b => b.id))
        }
    }

    const handleSuccess = () => {
        setSelectedIds([])
        router.push('/dashboard/shipments')
        router.refresh()
    }

    const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const code = scanInput.trim()
            if (!code) return

            // Find box by box_number (exact match or case insensitive?)
            // Assuming Box Number is what is scanned.
            const box = boxes.find(b => b.box_number.toLowerCase() === code.toLowerCase())

            if (box) {
                if (mode === 'packing') {
                    // Start packing (navigate to box)
                    router.push(`/dashboard/dispatch/${box.id}`)
                    toast.success(`Abriendo caja ${box.box_number}`)
                    setScanInput('')
                    return
                }

                if (!selectedIds.includes(box.id)) {
                    setSelectedIds(prev => [...prev, box.id])
                    toast.success(`Caja ${box.box_number} seleccionada`)
                } else {
                    toast.info(`La caja ${box.box_number} ya está seleccionada`)
                }
                setScanInput('')
            } else {
                toast.error(`Caja con código ${code} no encontrada o no está activa`)
                setScanInput('')
            }
        }
    }

    return (
        <div className="flex-1">
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold">
                            {mode === 'packing' ? 'Cajas Activas' : 'Cajas Activas (Para Salida)'}
                        </h2>
                        {boxes.length > 0 && mode === 'shipping' && (
                            <Button variant="ghost" size="sm" onClick={toggleAll} className="flex items-center gap-2">
                                <CheckSquare className={`h-4 w-4 ${selectedIds.length === boxes.length ? '' : 'hidden'}`} />
                                <Square className={`h-4 w-4 ${selectedIds.length === boxes.length ? 'hidden' : ''}`} />
                                <span>{selectedIds.length === boxes.length ? 'Deseleccionar todo' : 'Seleccionar todo'}</span>
                            </Button>
                        )}
                    </div>

                    {selectedIds.length > 0 && mode === 'shipping' && (
                        <DispatchDialog
                            selectedBoxIds={selectedIds}
                            onSuccess={handleSuccess}
                        />
                    )}
                </div>

                {/* Scanner Input — solo visible en modo shipping */}
                {mode === 'shipping' && (
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-2xl">🔫</span>
                        </div>
                        <input
                            type="text"
                            className="flex h-12 w-full rounded-md border border-input bg-background px-3 pl-12 py-2 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Escanear código de caja para seleccionar (Enter)..."
                            value={scanInput}
                            onChange={(e) => setScanInput(e.target.value)}
                            onKeyDown={handleScan}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground mt-1 ml-1">
                            Pistolea las cajas una por una para agregarlas a la selección.
                        </p>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {boxes.map(box => {
                    const isSelected = selectedIds.includes(box.id)
                    return (
                        <Card
                            key={box.id}
                            className={`hover:shadow-md transition-shadow relative border-l-4 border-l-orange-400 ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                        >
                            {mode === 'shipping' && (
                                <div className="absolute top-2 left-2 z-10">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleSelection(box.id)}
                                    />
                                </div>
                            )}

                            <CardHeader className={`pb-2 ${mode === 'shipping' ? 'pl-10' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">{box.box_number}</CardTitle>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {box.models?.brands?.name} {box.models?.name}
                                </p>
                                {isAdmin && (
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <EditBoxDialog box={box} models={models || []} />
                                        <DeleteBoxButton boxId={box.id} boxNumber={box.box_number} />
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className={`${mode === 'shipping' ? 'pl-10' : ''}`}>
                                <div className="text-sm space-y-2">
                                    <p>Creado por: {box.users?.name || box.users?.email}</p>
                                    <p>Items: {box.equipment?.[0]?.count || 0} / {box.total_items}</p>

                                    {/* Action Buttons based on mode */}
                                    {mode === 'packing' ? (
                                        <Button asChild className="w-full mt-2" size="sm" variant="secondary">
                                            <Link href={`/dashboard/dispatch/${box.id}`}>
                                                Continuar Armado <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    ) : (
                                        <Button
                                            variant={isSelected ? "default" : "outline"}
                                            className="w-full mt-2"
                                            size="sm"
                                            onClick={() => toggleSelection(box.id)}
                                        >
                                            {isSelected ? 'Seleccionada' : 'Seleccionar para Salida'}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
                {boxes.length === 0 && (
                    <p className="text-muted-foreground col-span-full">No hay cajas abiertas actualmente.</p>
                )}
            </div>
        </div>
    )
}
