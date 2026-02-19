'use client'

import { useState, useRef, useEffect } from 'react'
import { addEquipment, deleteEquipment, closeBox } from './actions'
import { duplicateBox, updateBoxQuantity } from '../actions' // Import from parent dispatch actions
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash2, CheckCircle, PackageCheck, Printer, ArrowRight, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface ScannerProps {
    boxId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelConfig: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[]
    totalTarget: number
    status: string
    validSeries?: string[]
}

interface ItemUser {
    name?: string
    email?: string
}

export default function Scanner({ boxId, modelConfig, items, totalTarget, status, validSeries = [] }: ScannerProps) {
    const router = useRouter()
    // ... existing state ...

    // ... (rest of component logic remains same until render) ...


    const [inputs, setInputs] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [isEditingQty, setIsEditingQty] = useState(false)
    const [newQty, setNewQty] = useState(totalTarget)
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    // Config comes from model.series_config which is JSONB (array of objects)
    const fields = Array.isArray(modelConfig) ? modelConfig : []

    const progress = (items.length / totalTarget) * 100
    const isCompleted = items.length >= totalTarget
    const isClosed = status === 'closed' || status === 'dispatched'

    useEffect(() => {
        // Focus first input on mount
        if (inputRefs.current[0] && !isClosed) {
            inputRefs.current[0]?.focus()
        }
    }, [isClosed])

    const handleKeyDown = async (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault()

            // If strictly sequential, move to next input or submit
            if (index < fields.length - 1) {
                inputRefs.current[index + 1]?.focus()
            } else {
                // Submit
                handleScan({})
            }
        }
    }

    const handleScan = async (overrideData?: Record<string, string>) => {
        if (isClosed) return

        // Use override data if provided and has keys, otherwise use state
        const dataToUse = (overrideData && Object.keys(overrideData).length > 0) ? overrideData : inputs

        // Validate required fields
        for (const field of fields) {
            if (field.required && !dataToUse[field.name]) {
                toast.error(`El campo ${field.name} es obligatorio`)
                // Focus it
                const idx = fields.findIndex(f => f.name === field.name)
                inputRefs.current[idx]?.focus()
                return
            }
        }

        setLoading(true)
        const result = await addEquipment(boxId, dataToUse)
        setLoading(false)

        if (result.error) {
            toast.error(result.error)
            // Focus first input (or the one that caused error if we knew)
            inputRefs.current[0]?.select()
        } else {
            if (result.warning) {
                // Secondary Validation Warning
                toast.warning(result.warning, { duration: 5000 })
            } else {
                toast.success("Equipo agregado (Validación SAP OK)")
            }

            setInputs({}) // Clear inputs
            // Small delay to ensure focus works after state update
            setTimeout(() => inputRefs.current[0]?.focus(), 10)
        }
    }

    const handleDelete = async (itemId: string) => {
        if (isClosed) return;
        if (!confirm('¿Eliminar este equipo de la caja?')) return;
        const result = await deleteEquipment(itemId, boxId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Eliminado")
        }
    }

    const handleCloseBox = async () => {
        if (!confirm('¿Estás seguro de CERRAR esta caja? No se podrán agregar más equipos.')) return;
        setLoading(true)
        const result = await closeBox(boxId)
        setLoading(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Caja Cerrada Exitosamente")
        }
    }

    const handleContinueDispatch = async () => {
        setLoading(true)
        try {
            // 1. Close current box if not closed
            if (!isClosed) {
                const closeResult = await closeBox(boxId)
                if (closeResult.error) throw new Error(closeResult.error)
            }

            // 2. Clone box
            const cloneResult = await duplicateBox(boxId)
            if (cloneResult.error) throw new Error(cloneResult.error)

            toast.success("Caja cerrada y nueva caja creada")
            // 3. Redirect to new box
            router.push(`/dashboard/dispatch/${cloneResult.boxId}`)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error(error.message || "Error al continuar despacho")
            setLoading(false)
        }
    }

    const handleUpdateQty = async () => {
        setLoading(true)
        const result = await updateBoxQuantity(boxId, newQty)
        setLoading(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Cantidad actualizada")
            setIsEditingQty(false)
        }
    }

    const handleCloseAndPrint = async () => {
        if (!confirm('¿Cerrar caja y generar PDF?')) return;
        setLoading(true)
        const result = await closeBox(boxId)
        if (result.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            toast.success("Caja Cerrada")
            // Redirect to print page
            router.push(`/dashboard/dispatch/${boxId}/print`)
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
                <Card className={`border-2 ${isClosed ? 'border-gray-200 opacity-75' : 'border-primary/20'}`}>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            Escáner de Series
                            {isClosed && <Badge variant="secondary">CERRADA</Badge>}
                            {/* Debug: {validSeries.length} valid series loaded */}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isCompleted && !isClosed ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center bg-green-50 rounded-lg border border-green-200">
                                <CheckCircle className="h-16 w-16 text-green-600 animate-bounce" />
                                <div>
                                    <h3 className="text-xl font-bold text-green-800">¡Caja Completa!</h3>
                                    <p className="text-green-600">Has alcanzado la cantidad objetivo ({totalTarget}).</p>
                                </div>
                                <div className="grid gap-3 w-full max-w-xs">
                                    <Button size="lg" onClick={handleContinueDispatch} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg shadow-lg">
                                        {loading ? 'Procesando...' : (
                                            <>
                                                Cerrar y Continuar <ArrowRight className="ml-2 h-5 w-5" />
                                            </>
                                        )}
                                    </Button>
                                    <Button variant="outline" size="lg" onClick={handleCloseAndPrint} disabled={loading} className="w-full border-green-600 text-green-700 hover:bg-green-50">
                                        <Printer className="mr-2 h-5 w-5" />
                                        Cerrar y Generar PDF
                                    </Button>
                                    <Button variant="outline" size="lg" onClick={() => router.push(`/dashboard/dispatch/${boxId}/print-summary`)} className="w-full text-zinc-600 hover:bg-zinc-50">
                                        <Printer className="mr-2 h-5 w-5" />
                                        Ver Carátula
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleCloseBox} className="text-muted-foreground text-xs">
                                        Solo Cerrar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {fields.map((field: any, index: number) => (
                                    <div key={index} className="space-y-2">
                                        <label className="text-sm font-medium flex justify-between">
                                            <span>
                                                {field.name} {field.required && <span className="text-red-500">*</span>}
                                            </span>
                                            {field.length && <span className="text-xs text-muted-foreground bg-muted px-2 rounded">Max: {field.length}</span>}
                                        </label>
                                        <Input
                                            ref={el => { if (el) inputRefs.current[index] = el }}
                                            value={inputs[field.name] || ''}
                                            onChange={e => {
                                                // Remove spaces to prevent "fake" length
                                                const val = e.target.value.replace(/\s/g, '')
                                                const maxLen = field.length ? parseInt(String(field.length), 10) : 0

                                                if (maxLen > 0 && val.length > maxLen) return;

                                                const newInputs = { ...inputs, [field.name]: val }
                                                setInputs(newInputs)

                                                if (maxLen > 0 && val.length === maxLen) {
                                                    if (index < fields.length - 1) {
                                                        inputRefs.current[index + 1]?.focus()
                                                    } else {
                                                        handleScan(newInputs)
                                                    }
                                                }
                                            }}
                                            onKeyDown={e => handleKeyDown(e, index)}
                                            placeholder={`Escanear ${field.name}${field.length ? ` (${field.length} dig)` : ''}...`}
                                            className="h-12 text-lg"
                                            autoComplete="off"
                                            disabled={loading || isClosed}
                                        />
                                        {field.length && (
                                            <div className="text-xs text-muted-foreground text-right mt-1">
                                                {(inputs[field.name] || '').length} / {field.length}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <Button className="w-full h-12 text-lg" onClick={() => handleScan({})} disabled={loading || isClosed}>
                                    {loading ? 'Procesando...' : 'Registrar Equipo (Enter)'}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Progreso de la Caja</CardTitle>
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-bold">{items.length}</span>
                                <span className="text-sm text-muted-foreground">/ {totalTarget} equipos</span>
                                {!isClosed && (
                                    <div className="inline-block">
                                        <Dialog open={isEditingQty} onOpenChange={setIsEditingQty}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" title="Editar Cantidad">
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Editar Cantidad Objetivo</DialogTitle>
                                                    <DialogDescription>
                                                        Ajusta la cantidad total de equipos para esta caja.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="qty" className="text-right">
                                                            Cantidad
                                                        </Label>
                                                        <Input
                                                            id="qty"
                                                            type="number"
                                                            value={newQty}
                                                            onChange={(e) => setNewQty(Number(e.target.value))}
                                                            className="col-span-3"
                                                            min={items.length}
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button type="submit" onClick={handleUpdateQty}>Guardar Cambios</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}
                            </div>
                            {isCompleted && !isClosed && (
                                <Button onClick={handleCloseBox} disabled={loading} className="bg-green-600 hover:bg-green-700">
                                    <PackageCheck className="mr-2 h-4 w-4" />
                                    Cerrar Caja
                                </Button>
                            )}
                            {isClosed && (
                                <div className="flex gap-2">
                                    <Button asChild variant="secondary">
                                        <a href={`/dashboard/dispatch/${boxId}/print`} target="_blank" rel="noopener noreferrer">
                                            <Printer className="mr-2 h-4 w-4" />
                                            Imprimir Detalle
                                        </a>
                                    </Button>
                                    <Button asChild variant="outline">
                                        <a href={`/dashboard/dispatch/${boxId}/print-summary`} target="_blank" rel="noopener noreferrer">
                                            <Printer className="mr-2 h-4 w-4" />
                                            Ver Carátula
                                        </a>
                                    </Button>
                                    <Button disabled variant="outline" className="opacity-50">
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Caja Cerrada
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Progress value={progress} className={`h-4 ${isCompleted ? 'bg-green-100' : ''}`} indicatorClassName={isCompleted ? 'bg-green-600' : undefined} />
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Contenido de la Caja</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-h-[600px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>SAP</TableHead>
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {fields.map((f: any) => <TableHead key={f.name}>{f.name}</TableHead>)}
                                    <TableHead>Usuario</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {items.map((item, i) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-xs">{items.length - i}</TableCell>
                                        <TableCell>
                                            {item.is_sap_validated ? (
                                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                                    OK {(item.matched_position && item.matched_position !== 'SN-1' && item.matched_position !== 'S-1') ? `(${item.matched_position})` : ''}
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">No SAP</Badge>
                                            )}
                                        </TableCell>
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        {fields.map((f: any) => {
                                            const val = item.series_data[f.name]
                                            // Check if this specific field is the one that matched
                                            const isMatchedField = item.matched_position === f.name
                                            const isVerified = item.is_sap_validated && isMatchedField

                                            // Determine dot color
                                            let dotColor = "bg-gray-300"
                                            if (item.is_sap_validated) {
                                                if (isMatchedField) {
                                                    dotColor = item.validation_type === 'secondary' ? "bg-yellow-500" : "bg-green-500"
                                                }
                                            } else {
                                                dotColor = "bg-red-500"
                                            }

                                            return (
                                                <TableCell key={f.name} className="font-medium">
                                                    <div className="flex items-center gap-1">
                                                        <div className={`h-2 w-2 rounded-full ${dotColor}`} title={isVerified ? "Match SAP" : ""} />
                                                        <span className={isVerified ? (item.validation_type === 'secondary' ? "text-yellow-700 font-bold" : "text-green-700 font-bold") : "text-zinc-600"}>
                                                            {val}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            )
                                        })}
                                        <TableCell className="text-xs text-muted-foreground">
                                            {item.users?.name || item.users?.email?.split('@')[0]}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={fields.length + 4} className="text-center text-muted-foreground py-8">
                                            Escanea el primer equipo para comenzar
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
