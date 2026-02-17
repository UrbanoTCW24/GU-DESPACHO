'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface PrintButtonProps {
    label?: string
    className?: string
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function PrintButton({ label = "Imprimir", className, variant = "default" }: PrintButtonProps) {
    return (
        <Button onClick={() => window.print()} className={className} variant={variant}>
            <Printer className="mr-2 h-4 w-4" />
            {label}
        </Button>
    )
}
