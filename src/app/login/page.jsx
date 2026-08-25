'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-100'>
      <div className='w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl'>
        <div className='text-center mb-6'>
          <div className='flex items-center justify-center gap-2 mb-1'>
            <span className='text-2xl font-black text-amber-500 tracking-wider'>
              GALLER<span className='text-white'>IA</span>
            </span>
            <span className='text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/30'>
              AI
            </span>
          </div>
          <p className='text-sm text-slate-400'>Inicia sesión en tu cuenta</p>
        </div>

        {error && (
          <div className='bg-red-500/10 border border-red-500 text-red-400 text-sm p-3 rounded-lg mb-4'>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className='space-y-4'>
          <div>
            <label className='block text-xs font-semibold uppercase text-slate-400 mb-1'>
              Correo Electrónico
            </label>
            <input
              type='email'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500'
              placeholder='correo@ejemplo.com'
            />
          </div>

          <div>
            <label className='block text-xs font-semibold uppercase text-slate-400 mb-1'>
              Contraseña
            </label>
            <input
              type='password'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500'
              placeholder='••••••••'
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold py-2.5 rounded-lg transition text-sm disabled:opacity-50 mt-2'
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className='text-center text-xs text-slate-400 mt-6'>
          ¿No tienes cuenta?{' '}
          <Link href='/registro' className='text-amber-500 hover:underline'>
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
