import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { BrandManager } from './brand-manager'
import { ModelManager } from './model-manager'
import { SAPUploader } from './sap-uploader'

export default async function ConfigPage() {
    const supabase = await createClient()

    // 1. Verify User is Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: requesterData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!requesterData || (requesterData.role !== 'admin' && requesterData.role !== 'super_admin')) {
        redirect('/dashboard')
    }

    // 2. Fetch Data
    const { data: brands } = await supabase.from('brands').select('*').order('name')
    const { data: models } = await supabase.from('models').select('*, brands(name)').order('name')

    return (
        <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 space-y-6">
                <BrandManager brands={brands || []} />
                <SAPUploader />
            </div>
            <div className="md:col-span-2">
                <ModelManager brands={brands || []} models={models || []} />
            </div>
        </div>
    )
}
