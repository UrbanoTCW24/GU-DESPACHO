'use client'

import { useState } from 'react'
import { UserRole } from '@/hooks/use-rbac'
import { updateUserRole } from './actions'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface User {
    id: string
    name: string | null
    email: string
    role: UserRole
    created_at: string
}

export function UserTable({ users }: { users: User[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            setLoadingId(userId)
            await updateUserRole(userId, newRole as UserRole)
            toast.success("Rol actualizado", {
                description: "El rol del usuario ha sido cambiado exitosamente.",
            })
        } catch {
            toast.error("Error", {
                description: "No se pudo actualizar el rol.",
            })
        } finally {
            setLoadingId(null)
        }
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'super_admin': return 'bg-purple-500 hover:bg-purple-600';
            case 'admin': return 'bg-blue-500 hover:bg-blue-600';
            default: return 'bg-gray-500 hover:bg-gray-600';
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol Actual</TableHead>
                        <TableHead>Cambiar Rol</TableHead>
                        <TableHead className="text-right">ID</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name || '-'}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                                <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                            </TableCell>
                            <TableCell>
                                <Select
                                    disabled={loadingId === user.id}
                                    defaultValue={user.role}
                                    onValueChange={(value) => handleRoleChange(user.id, value)}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Seleccionar rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="operator">Operador</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{user.id}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
