'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Bird } from 'lucide-react'

export default function InventarioPage() {
  const supabase = createClient()
  const [ejemplares, setEjemplares] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    numero_anillo: '',
    apodo: '',
    color_pluma: '',
    color_pata: '',
    tipo_pata: 'Normal',
    criadero_origen: '',
    mes_nacimiento: 1,
    ano_nacimiento: new Date().getFullYear(),
  })

  const cargarEjemplares = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ejemplares')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setEjemplares(data)
    setLoading(false)
  }

  useEffect(() => {
    cargarEjemplares()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase.from('ejemplares').insert({
      ...form,
      criador_id: user.id,
    })

    if (!error) {
      setShowModal(false)
      setForm({
        numero_anillo: '',
        apodo: '',
        color_pluma: '',
        color_pata: '',
        tipo_pata: 'Normal',
        criadero_origen: '',
        mes_nacimiento: 1,
        ano_nacimiento: new Date().getFullYear(),
      })
      cargarEjemplares()
    } else {
      alert('Error al guardar: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Seguro que deseas eliminar este ejemplar?')) {
      await supabase.from('ejemplares').delete().eq('id', id)
      cargarEjemplares()
    }
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-slate-100'>
            Ficha de Ejemplares
          </h1>
          <p className='text-sm text-slate-400'>
            Control de inventario, linaje y registro de aves
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className='flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition'
        >
          <Plus size={16} /> Nuevo Gallo
        </button>
      </div>

      {/* Grid de Gallos */}
      {loading ? (
        <p className='text-slate-500 text-sm'>Cargando inventario...</p>
      ) : ejemplares.length === 0 ? (
        <div className='text-center py-16 border border-dashed border-slate-800 rounded-2xl'>
          <Bird className='mx-auto text-slate-600 mb-3' size={40} />
          <p className='text-slate-400 text-sm'>
            Aún no tienes gallos registrados en tu criadero.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {ejemplares.map((gallo) => (
            <div
              key={gallo.id}
              className='bg-slate-900 border border-slate-800 p-5 rounded-2xl relative'
            >
              <div className='flex justify-between items-start'>
                <div>
                  <span className='text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded'>
                    Aro #{gallo.numero_anillo}
                  </span>
                  <h3 className='text-lg font-bold text-slate-100 mt-2'>
                    {gallo.apodo || 'Sin Apodo'}
                  </h3>
                </div>
                <button
                  onClick={() => handleDelete(gallo.id)}
                  className='text-slate-500 hover:text-red-400 transition'
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className='mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3'>
                <div>
                  <span className='text-slate-500'>Pluma:</span>{' '}
                  {gallo.color_pluma || 'N/A'}
                </div>
                <div>
                  <span className='text-slate-500'>Pata:</span>{' '}
                  {gallo.color_pata || 'N/A'} ({gallo.tipo_pata})
                </div>
                <div>
                  <span className='text-slate-500'>Nacimiento:</span>{' '}
                  {gallo.mes_nacimiento}/{gallo.ano_nacimiento}
                </div>
                <div>
                  <span className='text-slate-500'>Origen:</span>{' '}
                  {gallo.criadero_origen || 'Propio'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Registro */}
      {showModal && (
        <div className='fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6'>
            <h2 className='text-lg font-bold text-slate-100 mb-4'>
              Registrar Nuevo Gallo
            </h2>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    N° de Anillo / Aro *
                  </label>
                  <input
                    type='text'
                    required
                    value={form.numero_anillo}
                    onChange={(e) =>
                      setForm({ ...form, numero_anillo: e.target.value })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                    placeholder='Ej. 1042'
                  />
                </div>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Apodo / Nombre
                  </label>
                  <input
                    type='text'
                    value={form.apodo}
                    onChange={(e) =>
                      setForm({ ...form, apodo: e.target.value })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                    placeholder='Ej. El Cenizo'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Color de Pluma
                  </label>
                  <input
                    type='text'
                    value={form.color_pluma}
                    onChange={(e) =>
                      setForm({ ...form, color_pluma: e.target.value })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                    placeholder='Ej. Giro / Colorado'
                  />
                </div>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Color de Pata
                  </label>
                  <input
                    type='text'
                    value={form.color_pata}
                    onChange={(e) =>
                      setForm({ ...form, color_pata: e.target.value })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                    placeholder='Ej. Amarilla / Verde'
                  />
                </div>
              </div>

              <div className='grid grid-cols-3 gap-3'>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Tipo de Pata
                  </label>
                  <select
                    value={form.tipo_pata}
                    onChange={(e) =>
                      setForm({ ...form, tipo_pata: e.target.value })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  >
                    <option value='Normal'>Normal</option>
                    <option value='Escamada'>Escamada</option>
                    <option value='Cuadrada'>Cuadrada</option>
                  </select>
                </div>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Mes Nac.
                  </label>
                  <input
                    type='number'
                    min='1'
                    max='12'
                    value={form.mes_nacimiento}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        mes_nacimiento: parseInt(e.target.value),
                      })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  />
                </div>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Año Nac.
                  </label>
                  <input
                    type='number'
                    value={form.ano_nacimiento}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ano_nacimiento: parseInt(e.target.value),
                      })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs text-slate-400 mb-1'>
                  Criadero de Origen
                </label>
                <input
                  type='text'
                  value={form.criadero_origen}
                  onChange={(e) =>
                    setForm({ ...form, criadero_origen: e.target.value })
                  }
                  className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  placeholder='Ej. Criadero Propio / Compra externa'
                />
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
                  Guardar Gallo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
