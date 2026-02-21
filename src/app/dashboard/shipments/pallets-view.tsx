'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
    Plus, Trash2, X, Loader2, Truck, Package, ScanLine, CheckSquare, Square,
} from 'lucide-react'
import {
    createPallet, addBoxToPallet, removeBoxFromPallet,
    deletePallet, dispatchPallets,
} from './pallet-actions'
import { PalletDownloadButton } from './pallet-download-button'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pallet = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Box = any

interface PalletsViewProps {
    pallets: Pallet[]
    availableBoxes: Box[]   // boxes not in any pallet and not dispatched
}

export function PalletsView({ pallets: initialPallets, availableBoxes }: PalletsViewProps) {
    const router = useRouter()

    // ── Create pallet state ───────────────────────────────────────────────────
    const [createOpen, setCreateOpen] = useState(false)
    const [newPalletName, setNewPalletName] = useState('')
    const [creating, setCreating] = useState(false)

    // ── Active pallet for scanning ────────────────────────────────────────────
    const [activePalletId, setActivePalletId] = useState<string | null>(null)
    const [scanInput, setScanInput] = useState('')

    // ── Dispatch state ────────────────────────────────────────────────────────
    const [dispatchOpen, setDispatchOpen] = useState(false)
    const [dispatchPalletId, setDispatchPalletId] = useState<string | null>(null)
    const [sapExitId, setSapExitId] = useState('')
    const [notes, setNotes] = useState('')
    const [dispatching, setDispatching] = useState(false)

    const refresh = () => {
        router.push('/dashboard/shipments?tab=tarimas')
        router.refresh()
    }

    // ── Create pallet ─────────────────────────────────────────────────────────
    const handleCreate = async () => {
        setCreating(true)
        const result = await createPallet(newPalletName)
        setCreating(false)
        if (result.error) { toast.error(result.error); return }
        toast.success(`Tarima creada`)
        setNewPalletName('')
        setCreateOpen(false)
        refresh()
    }

    // ── Scanner ───────────────────────────────────────────────────────────────
    const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        const code = scanInput.trim()
        if (!code || !activePalletId) return

        const box = availableBoxes.find(b => b.box_number.toLowerCase() === code.toLowerCase())
        if (!box) {
            toast.error(`Caja "${code}" no encontrada o ya fue asignada`)
            setScanInput('')
            return
        }

        const result = await addBoxToPallet(activePalletId, box.id)
        if (result.error) { toast.error(result.error) }
        else { toast.success(`Caja ${box.box_number} agregada`) }
        setScanInput('')
        refresh()
    }

    // ── Remove box ────────────────────────────────────────────────────────────
    const handleRemoveBox = async (boxId: string, boxNumber: string) => {
        const result = await removeBoxFromPallet(boxId)
        if (result.error) toast.error(result.error)
        else toast.success(`Caja ${boxNumber} removida de la tarima`)
        refresh()
    }

    // ── Delete pallet ─────────────────────────────────────────────────────────
    const handleDeletePallet = async (palletId: string, name: string) => {
        if (!confirm(`¿Eliminar ${name}? Las cajas quedarán sin tarima asignada.`)) return
        const result = await deletePallet(palletId)
        if (result.error) toast.error(result.error)
        else toast.success(`${name} eliminada`)
        refresh()
    }

    // ── Dispatch ──────────────────────────────────────────────────────────────
    const openDispatch = (palletId: string) => {
        setDispatchPalletId(palletId)
        setSapExitId('')
        setNotes('')
        setDispatchOpen(true)
    }

    const handleDispatch = async () => {
        if (!dispatchPalletId || !sapExitId.trim()) {
            toast.error('Ingresa el ID de Salida SAP')
            return
        }
        setDispatching(true)
        const result = await dispatchPallets([dispatchPalletId], sapExitId, notes)
        setDispatching(false)

        if (result.error) { toast.error(result.error as string); return }

        const failed = result.results?.filter(r => r.error)
        if (failed?.length) {
            toast.error(`Error en tarima: ${failed[0].error}`)
        } else {
            toast.success('Tarima despachada correctamente')
            setDispatchOpen(false)
        }
        refresh()
    }

    const dispatchingPallet = dispatchPalletId
        ? initialPallets.find(x => x.id === dispatchPalletId)
        : null

    return (
        <div className="space-y-6">
            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Create button */}
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Nueva Tarima
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[380px]">
                        <DialogHeader>
                            <DialogTitle>Crear Nueva Tarima</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 py-2">
                            <Label>Nombre (opcional, se auto-genera)</Label>
                            <Input
                                placeholder="Ej. TARIMA-005"
                                value={newPalletName}
                                onChange={e => setNewPalletName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                autoFocus
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreate} disabled={creating}>
                                <Loader2 className={`mr-2 h-4 w-4 animate-spin ${creating ? '' : 'hidden'}`} />
                                <span>{creating ? 'Creando...' : 'Crear'}</span>
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Scanner — only visible when a pallet is selected */}
                {activePalletId && (
                    <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                        <span className="text-xl">🔫</span>
                        <Input
                            placeholder={`Escanear caja → ${initialPallets.find(p => p.id === activePalletId)?.name}`}
                            value={scanInput}
                            onChange={e => setScanInput(e.target.value)}
                            onKeyDown={handleScan}
                            className="h-10"
                            autoFocus
                        />
                        <Button variant="ghost" size="sm" onClick={() => { setActivePalletId(null); setScanInput('') }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {initialPallets.length === 0 && (
                <p className="text-muted-foreground text-sm">
                    No hay tarimas activas. Crea una nueva para empezar a agregar cajas.
                </p>
            )}

            {/* ── Pallets grid ─────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {initialPallets.map((pallet: Pallet) => {
                    const isActive = activePalletId === pallet.id
                    const boxCount = pallet.boxes?.length || 0
                    const totalSeries = pallet.boxes?.reduce(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (sum: number, b: any) => sum + (b.equipment?.[0]?.count || 0), 0
                    ) || 0

                    return (
                        <Card
                            key={pallet.id}
                            className={`border-l-4 transition-all ${isActive ? 'border-l-blue-500 ring-2 ring-blue-400/40' : 'border-l-orange-400'}`}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <CardTitle className="text-base font-bold">{pallet.name}</CardTitle>
                                        <p className="text-xs text-muted-foreground">
                                            {boxCount} caja{boxCount !== 1 ? 's' : ''} · {totalSeries} series
                                        </p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Button
                                            variant={isActive ? 'default' : 'outline'}
                                            size="sm"
                                            className="gap-1 text-xs"
                                            onClick={() => setActivePalletId(isActive ? null : pallet.id)}
                                            title={isActive ? 'Dejar de agregar cajas' : 'Agregar cajas a esta tarima'}
                                        >
                                            <ScanLine className="h-3 w-3" />
                                            {isActive ? 'Activa' : 'Agregar'}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3">
                                {/* Box list */}
                                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                                    {boxCount === 0 && (
                                        <p className="text-xs text-muted-foreground italic">Sin cajas aún</p>
                                    )}
                                    {pallet.boxes?.map((box: Box) => (
                                        <div
                                            key={box.id}
                                            className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-mono font-semibold">{box.box_number}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {box.models?.brands?.name} {box.models?.name}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                onClick={() => handleRemoveBox(box.id, box.box_number)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-1 flex-wrap">
                                    <Button
                                        size="sm"
                                        className="gap-1 bg-blue-600 hover:bg-blue-700 flex-1"
                                        disabled={boxCount === 0}
                                        onClick={() => openDispatch(pallet.id)}
                                    >
                                        <Truck className="h-3.5 w-3.5" />
                                        Despachar
                                    </Button>
                                    <PalletDownloadButton palletId={pallet.id} palletName={pallet.name} />
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive px-2"
                                        onClick={() => handleDeletePallet(pallet.id, pallet.name)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* ── Dispatch Dialog ───────────────────────────────────────────── */}
            <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle>Despachar Tarima</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {dispatchingPallet && (
                            <div className="rounded-md bg-muted px-4 py-3 space-y-1">
                                <p className="font-semibold">{dispatchingPallet.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {dispatchingPallet.boxes?.length || 0} caja(s) &middot; {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        dispatchingPallet.boxes?.reduce((s: number, b: any) => s + (b.equipment?.[0]?.count || 0), 0)
                                    } series
                                </p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Número de Salida SAP <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="Ej. 600012345"
                                value={sapExitId}
                                onChange={e => setSapExitId(e.target.value.toUpperCase())}
                                className="font-mono text-lg"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notas (opcional)</Label>
                            <Textarea
                                placeholder="Comentarios adicionales..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDispatchOpen(false)} disabled={dispatching}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDispatch}
                            disabled={dispatching || !sapExitId.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Loader2 className={`mr-2 h-4 w-4 animate-spin ${dispatching ? '' : 'hidden'}`} />
                            <span>{dispatching ? 'Despachando...' : 'Confirmar Despacho'}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
