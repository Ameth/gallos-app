'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Credenciales incorrectas. Verifica tu correo o contraseña.')
      setLoading(false)
    } else {
      router.push('/dashboard/torneos')
      router.refresh()
    }
  }

  return (
    <div className='min-h-screen bg-slate-950 flex items-center justify-center p-4'>
      <div className='w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden'>
        {/* Logo Institucional */}
        <div className='text-center mb-6'>
          <div className='relative w-28 h-28 mx-auto mb-3 rounded-2xl overflow-hidden border border-amber-500/30 shadow-lg bg-black'>
            <Image
              src='/logo-mi-querencia.jpeg'
              alt='Centro Turístico Mi Querencia'
              fill
              className='object-cover'
              priority
            />
          </div>
          <h1 className='text-lg font-black text-slate-100 tracking-wider'>
            CENTRO TURÍSTICO MI QUERENCIA
          </h1>
          <p className='text-[11px] text-amber-500 font-semibold uppercase tracking-widest mt-0.5'>
            Panel de Cotejo y Control de Valla
          </p>
        </div>

        {error && (
          <div className='bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mb-6 text-center font-medium'>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className='space-y-4'>
          <div>
            <label className='block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'>
              Correo Electrónico
            </label>
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500'>
                <Mail size={16} />
              </div>
              <input
                type='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition'
                placeholder='admin@miquerencia.com'
              />
            </div>
          </div>

          <div>
            <label className='block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5'>
              Contraseña
            </label>
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500'>
                <Lock size={16} />
              </div>
              <input
                type='password'
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition'
                placeholder='••••••••'
              />
            </div>
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-amber-500/10 mt-2'
          >
            {loading ? 'Accediendo al Sistema...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className='mt-6 text-center border-t border-slate-800 pt-3'>
          <p className='text-[11px] text-slate-500'>
            Falcón - Venezuela • Sistema de Uso Exclusivo
          </p>
        </div>
      </div>
    </div>
  )
}
