'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegistroPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [nombreEntidad, setNombreEntidad] = useState('')
  const [rol, setRol] = useState('criador')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_completo: nombreCompleto,
          nombre_entidad: nombreEntidad,
          rol: rol,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
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
          <p className='text-sm text-slate-400'>
            Crea tu cuenta de Criador o Club/Gallera
          </p>
        </div>

        {error && (
          <div className='bg-red-500/10 border border-red-500 text-red-400 text-sm p-3 rounded-lg mb-4'>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className='space-y-4'>
          <div>
            <label className='block text-xs font-semibold uppercase text-slate-400 mb-2'>
              Tipo de Cuenta
            </label>
            <div className='grid grid-cols-2 gap-3'>
              <button
                type='button'
                onClick={() => setRol('criador')}
                className={`py-2 text-sm font-medium rounded-lg border transition ${
                  rol === 'criador'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                Criador / Traba
              </button>
              <button
                type='button'
                onClick={() => setRol('gallera')}
                className={`py-2 text-sm font-medium rounded-lg border transition ${
                  rol === 'gallera'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                Club / Gallera
              </button>
            </div>
          </div>

          <div>
            <label className='block text-xs font-semibold uppercase text-slate-400 mb-1'>
              Nombre Completo
            </label>
            <input
              type='text'
              required
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className='w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500'
              placeholder='Ej. Carlos Mendoza'
            />
          </div>

          <div>
            <label className='block text-xs font-semibold uppercase text-slate-400 mb-1'>
              {rol === 'criador'
                ? 'Nombre de la Traba / Criadero'
                : 'Nombre de la Gallera / Club'}
            </label>
            <input
              type='text'
              required
              value={nombreEntidad}
              onChange={(e) => setNombreEntidad(e.target.value)}
              className='w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500'
              placeholder={
                rol === 'criador'
                  ? 'Ej. Traba La Furia'
                  : 'Ej. Club Gallístico El Palenque'
              }
            />
          </div>

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
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className='text-center text-xs text-slate-400 mt-6'>
          ¿Ya tienes cuenta?{' '}
          <Link href='/login' className='text-amber-500 hover:underline'>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
