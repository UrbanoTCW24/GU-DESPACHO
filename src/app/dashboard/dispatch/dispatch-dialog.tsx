'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { Loader2, Truck } from 'lucide-react'
import { createDispatch } from './actions'

interface DispatchDialogProps {
    selectedBoxIds: string[]
    onSuccess: () => void
}

export function DispatchDialog({ selectedBoxIds, onSuccess }: DispatchDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<1 | 2>(1)

    // Form State
    const [dispatchType, setDispatchType] = useState<'BOX' | 'PALLET'>('PALLET')
    const [sapExitId, setSapExitId] = useState('')
    const [notes, setNotes] = useState('')

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (!newOpen) {
            // Reset state on close
            setTimeout(() => {
                setStep(1)
                setDispatchType('PALLET')
                setSapExitId('')
                setNotes('')
            }, 300)
        }
    }

    const handleSubmit = async () => {
        if (!sapExitId.trim()) {
            toast.error('Debes ingresar el ID de Salida SAP')
            return
        }

        setLoading(true)
        try {
            const result = await createDispatch(selectedBoxIds, sapExitId, dispatchType, notes)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Despacho registrado correctamente')
                onSuccess()
                handleOpenChange(false)
            }
        } catch (error) {
            toast.error('Error inexperado al procesar el despacho')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button disabled={selectedBoxIds.length === 0} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Truck className="h-4 w-4" />
                    Despachar Selección ({selectedBoxIds.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Registrar Despacho / Salida</DialogTitle>
                    <DialogDescription>
                        Vas a procesar la salida de {selectedBoxIds.length} caja(s) seleccionada(s).
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Dispatch Type */}
                    <div className="space-y-3">
                        <Label>Tipo de Despacho</Label>
                        <RadioGroup
                            defaultValue="PALLET"
                            value={dispatchType}
                            onValueChange={(v) => setDispatchType(v as 'BOX' | 'PALLET')}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div>
                                <RadioGroupItem value="PALLET" id="pallet" className="peer sr-only" />
                                <Label
                                    htmlFor="pallet"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                    <span className="mb-2 text-2xl">🏗️</span>
                                    <span className="font-semibold">Por Tarima</span>
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="BOX" id="box" className="peer sr-only" />
                                <Label
                                    htmlFor="box"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                    <span className="mb-2 text-2xl">📦</span>
                                    <span className="font-semibold">Por Caja</span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* SAP Exit ID */}
                    <div className="space-y-2">
                        <Label htmlFor="sap-id" className="text-right">
                            Número de Salida SAP <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="sap-id"
                            placeholder="Ej. 600012345"
                            value={sapExitId}
                            onChange={(e) => setSapExitId(e.target.value)}
                            className="col-span-3 font-mono text-lg uppercase"
                        />
                        <p className="text-xs text-muted-foreground">
                            Este ID se asignará a todas las cajas seleccionadas.
                        </p>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-right">
                            Notas (Opcional)
                        </Label>
                        <Textarea
                            id="notes"
                            placeholder="Comentarios adicionales..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !sapExitId} className="bg-blue-600 hover:bg-blue-700">
                        <Loader2 className={`mr-2 h-4 w-4 animate-spin ${loading ? '' : 'hidden'}`} />
                        <span>{loading ? 'Procesando...' : 'Confirmar Despacho'}</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
