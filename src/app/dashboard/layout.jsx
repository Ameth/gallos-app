import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Trophy, LogOut } from 'lucide-react'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className='min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans'>
      <header className='border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-2 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <Link
              href='/dashboard/torneos'
              className='flex items-center gap-3 group'
            >
              <div className='relative w-14 h-10 flex-shrink-0 transition transform group-hover:scale-105'>
                <Image
                  src='/logo-mi-querencia.png'
                  alt='Centro Agroturístico Mi Querencia'
                  fill
                  className='object-contain'
                  priority
                />
              </div>
              <div>
                <span className='text-sm font-black text-amber-500 tracking-wider block leading-tight'>
                  MI QUERENCIA
                </span>
                <span className='text-[10px] text-slate-400 font-semibold block leading-tight'>
                  Centro Agroturístico • Falcón
                </span>
              </div>
            </Link>

            <nav className='flex items-center gap-2 text-sm font-medium border-l border-slate-800 pl-6'>
              <Link
                href='/dashboard/torneos'
                className='flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition'
              >
                <Trophy size={16} className='text-amber-500' />
                Torneos y Cotejos
              </Link>
            </nav>
          </div>

          <div className='flex items-center gap-4'>
            <div className='text-right'>
              <p className='text-xs font-bold text-slate-200'>
                {perfil?.nombre_entidad ||
                  perfil?.nombre_completo ||
                  'Administración'}
              </p>
              <span className='inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'>
                Administrador General
              </span>
            </div>

            <form action='/auth/signout' method='post'>
              <button
                formAction={async () => {
                  'use server'
                  const client = await createClient()
                  await client.auth.signOut()
                  redirect('/login')
                }}
                className='flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-xl transition'
                title='Cerrar Sesión'
              >
                <LogOut size={13} />
                <span>Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className='flex-1 p-6 max-w-7xl mx-auto w-full'>{children}</main>
    </div>
  )
}
