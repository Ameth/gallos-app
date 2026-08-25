import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bird, Trophy, LogOut } from 'lucide-react'

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
      {/* Navbar Superior */}
      <header className='border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-3 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto flex items-center justify-between'>
          {/* Logo y Enlaces */}
          <div className='flex items-center gap-8'>
            <Link href='/dashboard' className='flex items-center gap-2'>
              <span className='text-xl font-black text-amber-500 tracking-wider'>
                GALLER<span className='text-white'>IA</span>
              </span>
              <span className='text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/30'>
                AI
              </span>
            </Link>

            <nav className='flex items-center gap-2 text-sm font-medium'>
              <Link
                href='/dashboard'
                className='flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition'
              >
                <Bird size={16} className='text-amber-500' />
                Mis Gallos (Inventario)
              </Link>

              <Link
                href='/dashboard/torneos'
                className='flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition'
              >
                <Trophy size={16} className='text-amber-500' />
                Torneos y Cotejo
              </Link>
            </nav>
          </div>

          {/* Perfil y Salir */}
          <div className='flex items-center gap-4'>
            <div className='text-right'>
              <p className='text-xs font-bold text-slate-200'>
                {perfil?.nombre_entidad || perfil?.nombre_completo}
              </p>
              <span className='inline-block text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20'>
                {perfil?.rol || 'Criador'}
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

      {/* Contenido Dinámico */}
      <main className='flex-1 p-6 max-w-7xl mx-auto w-full'>{children}</main>
    </div>
  )
}
