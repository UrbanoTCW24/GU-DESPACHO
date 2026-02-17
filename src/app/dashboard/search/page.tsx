'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { searchEquipmentBySeries } from './actions'
import Link from 'next/link'

export default function SearchPage() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<unknown[]>([])
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setLoading(true)
        setHasSearched(true)
        const data = await searchEquipmentBySeries(query)
        setResults(data)
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Búsqueda de Trazabilidad</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Buscar por Serie o Número de Caja</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <Input
                            placeholder="Ingrese serie o número de caja..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="max-w-md"
                        />
                        <Button type="submit" disabled={loading}>
                            <span>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            </span>
                            Buscar
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {hasSearched && (
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Resultados ({results.length})</h2>

                    {results.length === 0 ? (
                        <div className="text-muted-foreground">No se encontraron equipos con esa serie.</div>
                    ) : (
                        <div className="grid gap-4">
                            {results.map((item: any) => (
                                <Card key={item.id}>
                                    <CardContent className="pt-6">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-sm text-muted-foreground">Serie Escaneda</div>
                                                <div className="font-mono font-bold text-lg">{query} (Coincidencia en data)</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Caja Contenedora</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">{item.boxes?.box_number}</span>
                                                    <Badge variant={item.boxes?.status === 'open' ? 'secondary' : 'default'}>
                                                        {item.boxes?.status}
                                                    </Badge>
                                                    <Button variant="link" asChild className="h-auto p-0 ml-2">
                                                        <Link href={`/dashboard/dispatch/${item.box_id}`}>
                                                            Ver Caja
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Fecha de Escaneo</div>
                                                <div>{new Date(item.scanned_at).toLocaleString('es-MX')}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Escaneado Por</div>
                                                <div>{item.users?.email || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Validación SAP</div>
                                                <Badge variant={item.is_sap_validated ? 'default' : 'destructive'}>
                                                    {item.is_sap_validated ? 'OK' : 'PENDIENTE'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
