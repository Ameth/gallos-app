'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Plus,
  Trophy,
  Calendar,
  ArrowRight,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

export default function TorneosPage() {
  const supabase = createClient()

  const router = useRouter()
  const [torneoCargandoId, setTorneoCargandoId] = useState(null)

  const [torneos, setTorneos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState({
    nombre: '',
    fecha: new Date().toISOString().split('T')[0],
    max_comodines: 2,
    estado: 'PESAJE',
  })

  const cargarDatos = async () => {
    setLoading(true)
    const { data: tData } = await supabase
      .from('torneos')
      .select('*')
      .order('fecha', { ascending: false })

    if (tData) setTorneos(tData)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    cargarDatos()
  }, [])

  const abrirModalCrear = () => {
    setEditandoId(null)
    setForm({
      nombre: '',
      fecha: new Date().toISOString().split('T')[0],
      max_comodines: 2,
      estado: 'PESAJE',
    })
    setShowModal(true)
  }

  const abrirModalEditar = (torneo) => {
    setEditandoId(torneo.id)
    setForm({
      nombre: torneo.nombre || '',
      fecha: torneo.fecha || new Date().toISOString().split('T')[0],
      max_comodines: torneo.max_comodines ?? 2,
      estado: torneo.estado || 'PESAJE',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const payload = {
      nombre: form.nombre.trim().toUpperCase(),
      fecha: form.fecha,
      max_comodines: parseInt(form.max_comodines) || 0,
      estado: form.estado,
    }

    if (editandoId) {
      const { data, error } = await supabase
        .from('torneos')
        .update(payload)
        .eq('id', editandoId)
        .select()

      if (error) {
        alert('Error al actualizar torneo: ' + error.message)
        return
      }

      if (!data || data.length === 0) {
        alert(
          'No se pudo actualizar el registro. Verifica los permisos RLS en Supabase.',
        )
        return
      }

      setShowModal(false)
      setEditandoId(null)
      await cargarDatos()
    } else {
      const { error } = await supabase.from('torneos').insert({
        ...payload,
        gallera_id: user.id,
      })

      if (!error) {
        setShowModal(false)
        await cargarDatos()
      } else {
        alert('Error al crear torneo: ' + error.message)
      }
    }
  }

  const handleDeleteTorneo = async (id, nombre) => {
    if (
      confirm(
        `¿Estás seguro de eliminar el torneo "${nombre}"? Se borrarán sus inscripciones y peleas asociadas.`,
      )
    ) {
      const { error } = await supabase.from('torneos').delete().eq('id', id)
      if (!error) {
        cargarDatos()
      } else {
        alert('Error al eliminar: ' + error.message)
      }
    }
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-slate-100'>
            Torneos y Veladas
          </h1>
          <p className='text-sm text-slate-400'>
            Organiza torneos, administra el pesaje y realiza los cotejos
          </p>
        </div>

        <button
          onClick={abrirModalCrear}
          className='flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition'
        >
          <Plus size={16} /> Crear Torneo
        </button>
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
                  <div className='flex items-center gap-2'>
                    <span className='flex items-center gap-1 text-xs text-slate-500'>
                      <Calendar size={13} /> {torneo.fecha}
                    </span>
                    <button
                      onClick={() => abrirModalEditar(torneo)}
                      className='text-slate-400 hover:text-amber-400 p-1 transition'
                      title='Editar datos del torneo'
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteTorneo(torneo.id, torneo.nombre)
                      }
                      className='text-slate-500 hover:text-red-400 p-1 transition'
                      title='Eliminar torneo'
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className='text-lg font-bold text-slate-100'>
                  {torneo.nombre}
                </h3>
                <p className='text-xs text-slate-400 mt-1'>
                  Máx. comodines permitidos: {torneo.max_comodines}
                </p>
              </div>

              <div className='mt-5 pt-3 border-t border-slate-800/80'>
                <button
                  type='button'
                  onClick={() => {
                    setTorneoCargandoId(torneo.id)
                    router.push(`/dashboard/torneos/${torneo.id}`)
                  }}
                  disabled={torneoCargandoId === torneo.id}
                  className='cursor-pointer disabled:cursor-not-allowed disabled:opacity-75 flex items-center justify-between w-full bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold transition active:scale-95'
                >
                  {torneoCargandoId === torneo.id ? (
                    <>
                      <span className='flex items-center gap-2 text-amber-400'>
                        <Loader2 size={14} className='animate-spin' />
                        Abriendo Torneo...
                      </span>
                      <span className='text-[10px] text-slate-400 italic'>
                        Cargando datos
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Mesa Técnica y Cotejo</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Torneo */}
      {showModal && (
        <div className='fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6'>
            <h2 className='text-lg font-bold text-slate-100 mb-4'>
              {editandoId ? 'Editar Torneo' : 'Nuevo Torneo'}
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
                  className='w-full uppercase bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  placeholder='EJ. DERBY CARACAS'
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Fecha *
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
                        max_comodines: parseInt(e.target.value) || 0,
                      })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs text-slate-400 mb-1'>
                  Estado del Evento
                </label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-semibold'
                >
                  <option value='PESAJE'>PESAJE</option>
                  <option value='EN RUEDO'>EN RUEDO</option>
                  <option value='FINALIZADO'>FINALIZADO</option>
                </select>
              </div>

              <div className='flex justify-end gap-3 pt-4 border-t border-slate-800'>
                <button
                  type='button'
                  onClick={() => {
                    setShowModal(false)
                    setEditandoId(null)
                  }}
                  className='px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 transition'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  className='bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition'
                >
                  {editandoId ? 'Actualizar Evento' : 'Crear Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
