import { getBoxDetails } from './actions'
import { redirect } from 'next/navigation'
import Scanner from './scanner'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Box } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default async function BoxPage({ params }: { params: Promise<{ boxId: string }> }) {
    const { boxId } = await params
    const box = await getBoxDetails(boxId)

    if (!box) {
        return <div>Caja no encontrada</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/dashboard/dispatch">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Box className="h-6 w-6" />
                            {box.box_number}
                        </h1>
                        <Badge>{box.status === 'open' ? 'En Proceso' : box.status}</Badge>
                    </div>
                    <p className="text-muted-foreground">
                        {box.models.brands.name} - {box.models.name}
                    </p>
                </div>
            </div>

            <Scanner
                boxId={box.id}
                modelConfig={box.models.series_config}
                items={box.items}
                totalTarget={box.total_items}
                status={box.status}
            />
        </div>
    )
}
