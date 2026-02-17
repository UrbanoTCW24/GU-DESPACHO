import { promoteToSuperAdmin } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function FixAdminPage() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Reparar Permisos de Administrador</CardTitle>
                    <CardDescription>
                        Haz clic en el botón para asignarte el rol de <b>Super Admin</b> y crear tu registro de usuario si falta.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={promoteToSuperAdmin}>
                        <Button className="w-full" size="lg">
                            Promoverme a Super Admin
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
