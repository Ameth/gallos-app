'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trophy, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function TorneosPage() {
  const supabase = createClient()
  const [torneos, setTorneos] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    fecha: new Date().toISOString().split('T')[0],
    max_comodines: 2,
  })

  const cargarDatos = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: pData } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (pData) setPerfil(pData)
    }

    const { data: tData } = await supabase
      .from('torneos')
      .select('*')
      .order('fecha', { ascending: false })

    if (tData) setTorneos(tData)
    setLoading(false)
  }

  useEffect(() => {
    let montado = true

    const obtenerDatos = async () => {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user && montado) {
        const { data: pData } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (pData && montado) setPerfil(pData)
      }

      const { data: tData } = await supabase
        .from('torneos')
        .select('*')
        .order('fecha', { ascending: false })

      if (montado) {
        if (tData) setTorneos(tData)
        setLoading(false)
      }
    }

    obtenerDatos()

    return () => {
      montado = false
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (perfil?.rol !== 'gallera' && perfil?.rol !== 'admin') {
      alert('Solo las cuentas de tipo Club / Gallera pueden crear eventos.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('torneos').insert({
      ...form,
      gallera_id: user.id,
    })

    if (!error) {
      setShowModal(false)
      setForm({
        nombre: '',
        fecha: new Date().toISOString().split('T')[0],
        max_comodines: 2,
      })
      cargarDatos()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const esOrganizador = perfil?.rol === 'gallera' || perfil?.rol === 'admin'

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-slate-100'>
            Torneos y Veladas
          </h1>
          <p className='text-sm text-slate-400'>
            {esOrganizador
              ? 'Organiza torneos, administra el pesaje y realiza los cotejos'
              : 'Consulta las carteleras de torneos activos e inscribe tus gallos'}
          </p>
        </div>

        {/* Solo visible para Galleras / Organizadores */}
        {esOrganizador && (
          <button
            onClick={() => setShowModal(true)}
            className='flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition'
          >
            <Plus size={16} /> Crear Torneo
          </button>
        )}
      </div>

      {loading ? (
        <p className='text-slate-500 text-sm'>Cargando torneos...</p>
      ) : torneos.length === 0 ? (
        <div className='text-center py-16 border border-dashed border-slate-800 rounded-2xl'>
          <Trophy className='mx-auto text-slate-600 mb-3' size={40} />
          <p className='text-slate-400 text-sm'>No hay torneos creados aún.</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {torneos.map((torneo) => (
            <div
              key={torneo.id}
              className='bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between'
            >
              <div>
                <div className='flex items-center justify-between mb-3'>
                  <span className='text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20'>
                    {torneo.estado}
                  </span>
                  <span className='flex items-center gap-1 text-xs text-slate-500'>
                    <Calendar size={13} /> {torneo.fecha}
                  </span>
                </div>
                <h3 className='text-lg font-bold text-slate-100'>
                  {torneo.nombre}
                </h3>
                <p className='text-xs text-slate-400 mt-1'>
                  Máx. comodines permitidos: {torneo.max_comodines}
                </p>
              </div>

              <div className='mt-5 pt-3 border-t border-slate-800/80'>
                <Link
                  href={`/dashboard/torneos/${torneo.id}`}
                  className='flex items-center justify-between w-full bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition'
                >
                  {esOrganizador
                    ? 'Mesa Técnica y Cotejo'
                    : 'Ver Cartelera y Pesaje'}{' '}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Torneo */}
      {showModal && esOrganizador && (
        <div className='fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6'>
            <h2 className='text-lg font-bold text-slate-100 mb-4'>
              Nuevo Torneo
            </h2>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label className='block text-xs text-slate-400 mb-1'>
                  Nombre del Torneo *
                </label>
                <input
                  type='text'
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  placeholder='Ej. Derby Internacional'
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Fecha
                  </label>
                  <input
                    type='date'
                    required
                    value={form.fecha}
                    onChange={(e) =>
                      setForm({ ...form, fecha: e.target.value })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  />
                </div>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Comodines Permitidos
                  </label>
                  <input
                    type='number'
                    min='0'
                    max='5'
                    value={form.max_comodines}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_comodines: parseInt(e.target.value),
                      })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  />
                </div>
              </div>

              <div className='flex justify-end gap-3 pt-4 border-t border-slate-800'>
                <button
                  type='button'
                  onClick={() => setShowModal(false)}
                  className='px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 transition'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  className='bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition'
                >
                  Crear Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
