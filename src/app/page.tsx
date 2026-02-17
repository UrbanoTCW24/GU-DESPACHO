import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Sistema G985 Despacho</h1>
      <p className="text-xl mb-4">El sistema está operativo.</p>
      <Link href="/login" className="text-blue-500 hover:underline">
        Ir al Login
      </Link>
    </div>
  )
}
