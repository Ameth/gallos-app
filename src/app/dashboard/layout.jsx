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
      <header className='border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-2.5 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3'>
          {/* Logo y Enlaces */}
          <div className='flex items-center justify-between w-full sm:w-auto gap-4'>
            <Link
              href='/dashboard/torneos'
              className='flex items-center gap-2.5 group'
            >
              <div className='relative w-12 h-9 flex-shrink-0 transition transform group-hover:scale-105'>
                <Image
                  src='/logo-mi-querencia.png'
                  alt='Centro Agroturístico Mi Querencia'
                  fill
                  className='object-contain'
                  priority
                />
              </div>
              <div>
                <span className='text-xs sm:text-sm font-black text-amber-500 tracking-wider block leading-tight'>
                  MI QUERENCIA
                </span>
                <span className='text-[9px] sm:text-[10px] text-slate-400 font-semibold block leading-tight'>
                  Centro Agroturístico • Falcón
                </span>
              </div>
            </Link>

            <Link
              href='/dashboard/torneos'
              className='flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition sm:hidden'
            >
              <Trophy size={14} className='text-amber-500' />
              Torneos
            </Link>
          </div>

          <nav className='hidden sm:flex items-center gap-2 text-sm font-medium border-l border-slate-800 pl-6'>
            <Link
              href='/dashboard/torneos'
              className='flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition text-xs sm:text-sm'
            >
              <Trophy size={16} className='text-amber-500' />
              Torneos y Cotejos
            </Link>
          </nav>

          {/* Perfil y Salida */}
          <div className='flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t border-slate-800/80 sm:border-t-0'>
            <div className='text-left sm:text-right'>
              <p className='text-xs font-bold text-slate-200 truncate max-w-[180px] sm:max-w-none'>
                {perfil?.nombre_entidad ||
                  perfil?.nombre_completo ||
                  'Administración'}
              </p>
              <span className='inline-block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'>
                Administrador
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
                className='flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl transition'
                title='Cerrar Sesión'
              >
                <LogOut size={13} />
                <span>Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className='flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full'>
        {children}
      </main>
    </div>
  )
}
