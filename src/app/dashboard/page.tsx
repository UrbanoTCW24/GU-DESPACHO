import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardStats } from './actions'
import { Box, PackageCheck, ScanLine, Clock } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

interface DashboardStats {
    boxesToday: number;
    openBoxes: number;
    itemsToday: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentActivity: any[];
    userMetrics: { name: string; email: string; count: number }[];
}

export default async function DashboardPage() {
    const stats: DashboardStats = await getDashboardStats()

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Cajas Hoy</CardTitle>
                        <Box className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.boxesToday}</div>
                        <p className="text-xs text-muted-foreground">Creadas hoy</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Equipos Hoy</CardTitle>
                        <ScanLine className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.itemsToday}</div>
                        <p className="text-xs text-muted-foreground">Escaneados hoy</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stats.openBoxes}</div>
                        <p className="text-xs text-muted-foreground">Cajas abiertas</p>
                    </CardContent>
                </Card>
                {/* <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
                        <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-muted-foreground"
                        >
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+573</div>
                        <p className="text-xs text-muted-foreground">+201 since last hour</p>
                    </CardContent>
                </Card> */}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {stats.recentActivity.map((box: any) => (
                                <div key={box.id} className="flex items-center">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                        <PackageCheck className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{box.box_number}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {box.models?.brands?.name} - {box.models?.name} ({box.users?.name || box.users?.email})
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium">
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant={box.status === 'open' ? 'secondary' : 'default'}>
                                                {box.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(box.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <Button size="icon" variant="ghost" asChild>
                                            <Link href={`/dashboard/dispatch/${box.id}`}>
                                                <ScanLine className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Top Usuarios (Cajas)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats.userMetrics.slice(0, 5).map((user) => (
                                <div key={user.email} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-medium">{user.name}</span>
                                        </div>
                                        <span className="font-bold">{user.count}</span>
                                    </div>
                                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{
                                                width: `${stats.userMetrics.length > 0 ? (user.count / stats.userMetrics[0].count) * 100 : 0}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {stats.userMetrics.length === 0 && (
                                <p className="text-muted-foreground text-sm text-center">No hay actividad registrada.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
