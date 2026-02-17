import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message: string, error: string }>
}) {
    const { message, error } = await searchParams
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-8 w-8 text-primary-foreground"
                            >
                                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                                <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
                                <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
                            </svg>
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">G985 Despacho Masivo</CardTitle>
                    <CardDescription className="text-center">
                        Ingresa tus credenciales para acceder al sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4 text-center">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="bg-green-500/15 text-green-600 text-sm p-3 rounded-md mb-4 text-center">
                            {message}
                        </div>
                    )}
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="nombre@empresa.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-4 pt-4">
                            <Button formAction={login} className="w-full">
                                Iniciar Sesión
                            </Button>
                            <Button formAction={signup} variant="outline" className="w-full">
                                Registrarse
                            </Button>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="text-center text-sm text-gray-500">
                    Contacta al administrador si no tienes acceso
                </CardFooter>
            </Card>
        </div>
    )
}
