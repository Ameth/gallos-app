'use client'

import { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generarCotejoAutomatico } from '@/lib/cotejador'
import {
  Scale,
  Plus,
  ShieldBan,
  Trash2,
  ArrowLeft,
  Users,
  Swords,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Award,
  BarChart3,
  Eye,
} from 'lucide-react'
import Link from 'next/link'

export default function TorneoDetallePage({ params }) {
  const { id: torneoId } = use(params)
  const supabase = createClient()

  const [perfil, setPerfil] = useState(null)
  const [torneo, setTorneo] = useState(null)
  const [inscripciones, setInscripciones] = useState([])
  const [peleas, setPeleas] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('cotejo')

  // Modal Pesaje
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    nombre_equipo: '',
    numero_anillo: '',
    marca: 1,
    peso_libras: 4,
    peso_onzas: 0,
    color_pata: '',
    tipo_pata: 'Normal',
    comodines: '',
  })

  // Modal Casamiento Manual
  const [galloSeleccionadoManual, setGalloSeleccionadoManual] = useState(null)
  const [rivalSeleccionadoManual, setRivalSeleccionadoManual] = useState(null)

  // Control de Combate (Arbitraje)
  const [peleaEnArbitraje, setPeleaEnArbitraje] = useState(null)
  const [segundosCombate, setSegundosCombate] = useState(0)
  const [cronometroActivo, setCronometroActivo] = useState(false)
  const [tipoEspuela, setTipoEspuela] = useState('Plástica 22mm')
  const [observaciones, setObservaciones] = useState('')
  const timerRef = useRef(null)

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
      .eq('id', torneoId)
      .single()
    const { data: iData } = await supabase
      .from('inscripciones_pelea')
      .select('*')
      .eq('torneo_id', torneoId)
      .order('created_at', { ascending: false })
    const { data: pData } = await supabase
      .from('peleas')
      .select('*, gallo_azul:gallo_azul_id(*), gallo_blanco:gallo_blanco_id(*)')
      .eq('torneo_id', torneoId)
      .order('numero_pelea', { ascending: true })

    if (tData) setTorneo(tData)
    if (iData) setInscripciones(iData)
    if (pData) setPeleas(pData)
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
        .eq('id', torneoId)
        .single()
      const { data: iData } = await supabase
        .from('inscripciones_pelea')
        .select('*')
        .eq('torneo_id', torneoId)
        .order('created_at', { ascending: false })
      const { data: pData } = await supabase
        .from('peleas')
        .select(
          '*, gallo_azul:gallo_azul_id(*), gallo_blanco:gallo_blanco_id(*)',
        )
        .eq('torneo_id', torneoId)
        .order('numero_pelea', { ascending: true })

      if (montado) {
        if (tData) setTorneo(tData)
        if (iData) setInscripciones(iData)
        if (pData) setPeleas(pData)
        setLoading(false)
      }
    }

    obtenerDatos()

    return () => {
      montado = false
    }
  }, [torneoId])

  useEffect(() => {
    if (cronometroActivo) {
      timerRef.current = setInterval(
        () => setSegundosCombate((prev) => prev + 1),
        1000,
      )
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [cronometroActivo])

  // Si es rol 'gallera' o 'admin', tiene permisos completos de mesa técnica y arbitraje
  const esOrganizador = perfil?.rol === 'gallera' || perfil?.rol === 'admin'

  const formatoTiempo = (totalSegs) => {
    const mins = Math.floor(totalSegs / 60)
    const segs = totalSegs % 60
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`
  }

  const abrirMesaArbitraje = (pelea) => {
    if (!esOrganizador) return
    setPeleaEnArbitraje(pelea)
    setSegundosCombate(pelea.duracion_segundos || 0)
    setTipoEspuela(pelea.tipo_espuela || 'Plástica 22mm')
    setObservaciones(pelea.observaciones || '')
    setCronometroActivo(false)
  }

  const handleFinalizarCombate = async (resultado, ganadorId = null) => {
    setCronometroActivo(false)
    const { error } = await supabase
      .from('peleas')
      .update({
        resultado: resultado,
        ganador_id: ganadorId,
        duracion_segundos: segundosCombate,
        tipo_espuela: tipoEspuela,
        observaciones: observaciones,
      })
      .eq('id', peleaEnArbitraje.id)

    if (!error) {
      setPeleaEnArbitraje(null)
      cargarDatos()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const handleSubmitPesaje = async (e) => {
    e.preventDefault()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const arrayComodines = form.comodines
      ? form.comodines
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : []

    const { error } = await supabase.from('inscripciones_pelea').insert({
      torneo_id: torneoId,
      criador_id: user.id,
      nombre_equipo:
        form.nombre_equipo || perfil?.nombre_entidad || 'Traba Sin Nombre',
      numero_anillo: form.numero_anillo,
      marca: parseInt(form.marca),
      peso_libras: parseInt(form.peso_libras),
      peso_onzas: parseInt(form.peso_onzas),
      color_pata: form.color_pata,
      tipo_pata: form.tipo_pata,
      comodines: arrayComodines,
    })

    if (!error) {
      setShowModal(false)
      setForm({
        nombre_equipo: '',
        numero_anillo: '',
        marca: 1,
        peso_libras: 4,
        peso_onzas: 0,
        color_pata: '',
        tipo_pata: 'Normal',
        comodines: '',
      })
      cargarDatos()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const handleEjecutarCotejoAuto = async () => {
    if (!esOrganizador) return
    const gallosEnPeleas = new Set()
    peleas.forEach((p) => {
      gallosEnPeleas.add(p.gallo_azul_id)
      gallosEnPeleas.add(p.gallo_blanco_id)
    })

    const disponibles = inscripciones.filter((i) => !gallosEnPeleas.has(i.id))
    if (disponibles.length < 2) {
      alert('Se requieren al menos 2 gallos disponibles para cotejar.')
      return
    }

    const { peleasGeneradas } = generarCotejoAutomatico(disponibles)
    if (peleasGeneradas.length === 0) {
      alert(
        'No se encontraron combinaciones compatibles. Usa el Casamiento Manual.',
      )
      return
    }

    let numeroPeleaActual = peleas.length + 1
    const registros = peleasGeneradas.map((p) => ({
      torneo_id: torneoId,
      numero_pelea: numeroPeleaActual++,
      gallo_azul_id: p.gallo_azul.id,
      gallo_blanco_id: p.gallo_blanco.id,
      tipo_casamiento: 'automatico',
    }))

    const { error } = await supabase.from('peleas').insert(registros)
    if (!error) cargarDatos()
    else alert('Error: ' + error.message)
  }

  const handleGuardarCruceManual = async () => {
    if (!esOrganizador || !galloSeleccionadoManual || !rivalSeleccionadoManual)
      return

    const nuevaPelea = {
      torneo_id: torneoId,
      numero_pelea: peleas.length + 1,
      gallo_azul_id: galloSeleccionadoManual.id,
      gallo_blanco_id: rivalSeleccionadoManual.id,
      tipo_casamiento: 'manual_forzado',
    }

    const { error } = await supabase.from('peleas').insert(nuevaPelea)
    if (!error) {
      setGalloSeleccionadoManual(null)
      setRivalSeleccionadoManual(null)
      cargarDatos()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const handleDeletePelea = async (peleaId) => {
    if (!esOrganizador) return
    if (confirm('¿Descasar esta pelea?')) {
      await supabase.from('peleas').delete().eq('id', peleaId)
      cargarDatos()
    }
  }

  const idsCasados = new Set()
  peleas.forEach((p) => {
    idsCasados.add(p.gallo_azul_id)
    idsCasados.add(p.gallo_blanco_id)
  })
  const gallosPendientes = inscripciones.filter((i) => !idsCasados.has(i.id))

  const peleasFinalizadas = peleas.filter((p) => p.resultado !== 'pendiente')
  const totalAzulGano = peleas.filter((p) => p.resultado === 'azul_gano').length
  const totalBlancoGano = peleas.filter(
    (p) => p.resultado === 'blanco_gano',
  ).length
  const totalTablas = peleas.filter((p) => p.resultado === 'tabla').length

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4'>
        <div>
          <Link
            href='/dashboard/torneos'
            className='inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold mb-2'
          >
            <ArrowLeft size={14} /> Volver a Torneos
          </Link>
          <div className='flex items-center gap-3'>
            <h1 className='text-2xl font-black text-slate-100'>
              {torneo?.nombre || 'Torneo'}
            </h1>
            {!esOrganizador && (
              <span className='flex items-center gap-1 text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md border border-slate-700'>
                <Eye size={12} /> Modo Participante
              </span>
            )}
          </div>
          <p className='text-xs text-slate-400 mt-0.5'>
            Fecha: {torneo?.fecha} • {inscripciones.length} Gallos Pesados •{' '}
            {peleas.length} Peleas
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <button
            onClick={() => setShowModal(true)}
            className='flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs transition'
          >
            <Plus size={14} /> Inscribir Gallo
          </button>

          {esOrganizador && (
            <button
              onClick={handleEjecutarCotejoAuto}
              className='flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-lg shadow-amber-500/10'
            >
              <Sparkles size={14} /> Cotejar con AI
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className='flex gap-4 border-b border-slate-800 text-sm'>
        <button
          onClick={() => setActiveTab('cotejo')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'cotejo'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Swords size={16} /> Cartelera ({peleas.length})
        </button>
        <button
          onClick={() => setActiveTab('pesaje')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'pesaje'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale size={16} /> Pesaje ({inscripciones.length})
        </button>
        <button
          onClick={() => setActiveTab('estadisticas')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'estadisticas'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 size={16} /> Totales y Porcentajes
        </button>
      </div>

      {/* Tab: Cartelera */}
      {activeTab === 'cotejo' && (
        <div className='space-y-6'>
          {esOrganizador && gallosPendientes.length > 0 && (
            <div className='bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl'>
              <div className='flex items-center gap-2 text-amber-400 font-bold text-sm mb-3'>
                <AlertTriangle size={18} /> {gallosPendientes.length} Gallos
                pendientes de casamiento
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2'>
                {gallosPendientes.map((g) => (
                  <div
                    key={g.id}
                    className='bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs'
                  >
                    <div>
                      <p className='font-bold text-slate-200'>
                        {g.nombre_equipo} (Aro {g.numero_anillo})
                      </p>
                      <p className='text-slate-400'>
                        {g.peso_libras}lb {g.peso_onzas}oz • Marca {g.marca}
                      </p>
                    </div>
                    <button
                      onClick={() => setGalloSeleccionadoManual(g)}
                      className='bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] transition'
                    >
                      Casar Manual
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {peleas.length === 0 ? (
            <div className='text-center py-16 border border-dashed border-slate-800 rounded-2xl'>
              <Swords className='mx-auto text-slate-600 mb-3' size={36} />
              <p className='text-slate-400 text-sm'>
                No hay peleas armadas todavía.
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {peleas.map((pelea) => {
                const diffPeso = Math.abs(
                  pelea.gallo_azul.peso_total_onzas -
                    pelea.gallo_blanco.peso_total_onzas,
                )
                const estaTerminada = pelea.resultado !== 'pendiente'

                return (
                  <div
                    key={pelea.id}
                    className={`bg-slate-900 border rounded-2xl p-4 relative transition ${estaTerminada ? 'border-emerald-500/30' : 'border-slate-800'}`}
                  >
                    <div className='flex justify-between items-center mb-3'>
                      <span className='text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-md'>
                        Pelea #{pelea.numero_pelea}
                      </span>
                      <div className='flex items-center gap-2'>
                        {pelea.tipo_casamiento === 'manual_forzado' && (
                          <span className='text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold'>
                            Manual
                          </span>
                        )}
                        {esOrganizador && (
                          <button
                            onClick={() => handleDeletePelea(pelea.id)}
                            className='text-slate-500 hover:text-red-400 transition'
                            title='Descasar pelea'
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className='grid grid-cols-11 gap-2 items-center text-center'>
                      {/* Azul */}
                      <div
                        className={`col-span-5 p-3 rounded-xl border ${pelea.resultado === 'azul_gano' ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500' : 'bg-blue-950/30 border-blue-900/40'}`}
                      >
                        <span className='text-[10px] font-bold text-blue-400 uppercase tracking-wider block'>
                          Esquina Azul
                        </span>
                        <p className='font-bold text-slate-100 text-sm mt-1'>
                          {pelea.gallo_azul.nombre_equipo}
                        </p>
                        <p className='text-xs text-slate-400'>
                          Aro: {pelea.gallo_azul.numero_anillo}
                        </p>
                        <p className='text-xs font-mono font-bold text-blue-300 mt-1'>
                          {pelea.gallo_azul.peso_libras}lb{' '}
                          {pelea.gallo_azul.peso_onzas}oz
                        </p>
                        {pelea.resultado === 'azul_gano' && (
                          <span className='inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1'>
                            <Award size={13} /> GANADOR
                          </span>
                        )}
                      </div>

                      <div className='col-span-1 text-slate-500 font-black text-xs'>
                        VS
                      </div>

                      {/* Blanco */}
                      <div
                        className={`col-span-5 p-3 rounded-xl border ${pelea.resultado === 'blanco_gano' ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500' : 'bg-slate-800/40 border-slate-700/50'}`}
                      >
                        <span className='text-[10px] font-bold text-slate-300 uppercase tracking-wider block'>
                          Esquina Blanca
                        </span>
                        <p className='font-bold text-slate-100 text-sm mt-1'>
                          {pelea.gallo_blanco.nombre_equipo}
                        </p>
                        <p className='text-xs text-slate-400'>
                          Aro: {pelea.gallo_blanco.numero_anillo}
                        </p>
                        <p className='text-xs font-mono font-bold text-slate-200 mt-1'>
                          {pelea.gallo_blanco.peso_libras}lb{' '}
                          {pelea.gallo_blanco.peso_onzas}oz
                        </p>
                        {pelea.resultado === 'blanco_gano' && (
                          <span className='inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1'>
                            <Award size={13} /> GANADOR
                          </span>
                        )}
                      </div>
                    </div>

                    <div className='mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs'>
                      <div className='text-slate-400'>
                        {estaTerminada ? (
                          <span className='font-mono text-amber-400'>
                            ⏱ {formatoTiempo(pelea.duracion_segundos)}
                          </span>
                        ) : (
                          <span>Δ {diffPeso} oz</span>
                        )}
                      </div>

                      {esOrganizador ? (
                        <button
                          onClick={() => abrirMesaArbitraje(pelea)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                            estaTerminada
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md'
                          }`}
                        >
                          <Swords size={13} />{' '}
                          {estaTerminada ? 'Modificar Fallo' : 'Entrar a Ruedo'}
                        </button>
                      ) : (
                        <span className='font-semibold text-slate-400 uppercase tracking-wider text-[10px]'>
                          {pelea.resultado.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Estadísticas */}
      {activeTab === 'estadisticas' && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='bg-slate-900 border border-slate-800 p-4 rounded-2xl'>
            <p className='text-xs text-slate-400 uppercase font-semibold'>
              Total Peleas
            </p>
            <p className='text-2xl font-black text-slate-100 mt-1'>
              {peleas.length}
            </p>
            <span className='text-[11px] text-emerald-400'>
              {peleasFinalizadas.length} Finalizadas
            </span>
          </div>
          <div className='bg-slate-900 border border-slate-800 p-4 rounded-2xl'>
            <p className='text-xs text-blue-400 uppercase font-semibold'>
              Victorias Azul
            </p>
            <p className='text-2xl font-black text-slate-100 mt-1'>
              {totalAzulGano}
            </p>
          </div>
          <div className='bg-slate-900 border border-slate-800 p-4 rounded-2xl'>
            <p className='text-xs text-slate-300 uppercase font-semibold'>
              Victorias Blanca
            </p>
            <p className='text-2xl font-black text-slate-100 mt-1'>
              {totalBlancoGano}
            </p>
          </div>
          <div className='bg-slate-900 border border-slate-800 p-4 rounded-2xl'>
            <p className='text-xs text-amber-400 uppercase font-semibold'>
              Tablas / Empates
            </p>
            <p className='text-2xl font-black text-slate-100 mt-1'>
              {totalTablas}
            </p>
          </div>
        </div>
      )}

      {/* Tab: Pesaje */}
      {activeTab === 'pesaje' && (
        <div className='overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60'>
          <table className='w-full text-left text-xs text-slate-300'>
            <thead className='bg-slate-800/80 text-slate-400 uppercase font-semibold border-b border-slate-700'>
              <tr>
                <th className='px-4 py-3'>Equipo</th>
                <th className='px-4 py-3'>Aro</th>
                <th className='px-4 py-3'>Marca</th>
                <th className='px-4 py-3 text-amber-400'>Peso Oficial</th>
                <th className='px-4 py-3'>Pata</th>
                <th className='px-4 py-3'>Comodines</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-800'>
              {inscripciones.map((ins) => (
                <tr key={ins.id} className='hover:bg-slate-800/40 transition'>
                  <td className='px-4 py-3 font-bold text-slate-100'>
                    {ins.nombre_equipo}
                  </td>
                  <td className='px-4 py-3 font-mono font-medium'>
                    {ins.numero_anillo}
                  </td>
                  <td className='px-4 py-3'>Marca {ins.marca}</td>
                  <td className='px-4 py-3 font-bold text-slate-100'>
                    {ins.peso_libras} lb {ins.peso_onzas} oz
                  </td>
                  <td className='px-4 py-3 text-slate-400'>
                    {ins.color_pata || 'N/A'} - {ins.tipo_pata}
                  </td>
                  <td className='px-4 py-3'>
                    {ins.comodines && ins.comodines.length > 0 ? (
                      <span className='text-red-400 text-[11px]'>
                        {ins.comodines.join(', ')}
                      </span>
                    ) : (
                      <span className='text-slate-600'>Ninguno</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Arbitraje */}
      {peleaEnArbitraje && esOrganizador && (
        <div className='fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50'>
          <div className='bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl'>
            <div className='text-center pb-4 border-b border-slate-800'>
              <span className='text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-3 py-1 rounded-md'>
                Arbitraje - Pelea #{peleaEnArbitraje.numero_pelea}
              </span>
              <div className='text-4xl font-mono font-black text-amber-400 my-3 tracking-widest'>
                {formatoTiempo(segundosCombate)}
              </div>
              <div className='flex justify-center gap-2'>
                <button
                  type='button'
                  onClick={() => setCronometroActivo(!cronometroActivo)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition ${
                    cronometroActivo
                      ? 'bg-red-500 text-white'
                      : 'bg-emerald-500 text-slate-950'
                  }`}
                >
                  {cronometroActivo ? <Pause size={15} /> : <Play size={15} />}{' '}
                  {cronometroActivo ? 'Pausar' : 'Iniciar Tiempo'}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setCronometroActivo(false)
                    setSegundosCombate(0)
                  }}
                  className='bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl transition'
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3 my-4'>
              <div>
                <label className='block text-xs text-slate-400 mb-1'>
                  Espuela
                </label>
                <input
                  type='text'
                  value={tipoEspuela}
                  onChange={(e) => setTipoEspuela(e.target.value)}
                  className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100'
                />
              </div>
              <div>
                <label className='block text-xs text-slate-400 mb-1'>
                  Observaciones
                </label>
                <input
                  type='text'
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100'
                />
              </div>
            </div>

            <div>
              <label className='block text-xs font-bold uppercase text-slate-400 mb-2'>
                Dictamen Oficial
              </label>
              <div className='grid grid-cols-2 gap-2 mb-2'>
                <button
                  type='button'
                  onClick={() =>
                    handleFinalizarCombate(
                      'azul_gano',
                      peleaEnArbitraje.gallo_azul.id,
                    )
                  }
                  className='bg-blue-950/60 border border-blue-600 hover:bg-blue-600 text-white font-bold p-3 rounded-xl text-xs transition text-center'
                >
                  🏆 Ganador Azul ({peleaEnArbitraje.gallo_azul.nombre_equipo})
                </button>
                <button
                  type='button'
                  onClick={() =>
                    handleFinalizarCombate(
                      'blanco_gano',
                      peleaEnArbitraje.gallo_blanco.id,
                    )
                  }
                  className='bg-slate-800/80 border border-slate-500 hover:bg-slate-200 hover:text-slate-950 text-white font-bold p-3 rounded-xl text-xs transition text-center'
                >
                  🏆 Ganador Blanco (
                  {peleaEnArbitraje.gallo_blanco.nombre_equipo})
                </button>
              </div>

              <div className='grid grid-cols-3 gap-2'>
                <button
                  type='button'
                  onClick={() => handleFinalizarCombate('tabla')}
                  className='bg-slate-800 hover:bg-amber-500/20 hover:text-amber-400 border border-slate-700 text-slate-300 font-semibold py-2 rounded-xl text-xs transition'
                >
                  Tabla (Empate)
                </button>
                <button
                  type='button'
                  onClick={() => handleFinalizarCombate('descasada')}
                  className='bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 text-slate-300 font-semibold py-2 rounded-xl text-xs transition'
                >
                  Descasada
                </button>
                <button
                  type='button'
                  onClick={() => handleFinalizarCombate('no_apta')}
                  className='bg-slate-800 hover:bg-red-500/20 hover:text-red-400 border border-slate-700 text-slate-300 font-semibold py-2 rounded-xl text-xs transition'
                >
                  No Apta
                </button>
              </div>
            </div>

            <div className='flex justify-end pt-4 border-t border-slate-800 mt-4'>
              <button
                type='button'
                onClick={() => setPeleaEnArbitraje(null)}
                className='px-4 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 transition'
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pesaje */}
      {showModal && (
        <div className='fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6'>
            <h2 className='text-lg font-bold text-slate-100 mb-4'>
              Registro en Báscula
            </h2>
            <form onSubmit={handleSubmitPesaje} className='space-y-4'>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Nombre del Equipo *
                  </label>
                  <input
                    type='text'
                    required
                    value={form.nombre_equipo}
                    onChange={(e) =>
                      setForm({ ...form, nombre_equipo: e.target.value })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                    placeholder='Ej. Traba La Furia'
                  />
                </div>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    N° Aro *
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
              </div>

              <div className='bg-slate-950 p-3 rounded-xl border border-slate-800'>
                <label className='block text-xs font-bold uppercase text-amber-400 mb-2'>
                  Peso en Báscula *
                </label>
                <div className='grid grid-cols-3 gap-3'>
                  <div>
                    <label className='block text-[10px] text-slate-500 mb-1'>
                      Libras (lb)
                    </label>
                    <input
                      type='number'
                      min='0'
                      max='10'
                      required
                      value={form.peso_libras}
                      onChange={(e) =>
                        setForm({ ...form, peso_libras: e.target.value })
                      }
                      className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold'
                    />
                  </div>
                  <div>
                    <label className='block text-[10px] text-slate-500 mb-1'>
                      Onzas (oz)
                    </label>
                    <input
                      type='number'
                      min='0'
                      max='15'
                      required
                      value={form.peso_onzas}
                      onChange={(e) =>
                        setForm({ ...form, peso_onzas: e.target.value })
                      }
                      className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold'
                    />
                  </div>
                  <div>
                    <label className='block text-[10px] text-slate-500 mb-1'>
                      Marca *
                    </label>
                    <input
                      type='number'
                      min='1'
                      required
                      value={form.marca}
                      onChange={(e) =>
                        setForm({ ...form, marca: e.target.value })
                      }
                      className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold'
                    />
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
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
                    placeholder='Ej. Amarilla'
                  />
                </div>
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
              </div>

              <div>
                <label className='block text-xs text-slate-400 mb-1'>
                  Comodines
                </label>
                <input
                  type='text'
                  value={form.comodines}
                  onChange={(e) =>
                    setForm({ ...form, comodines: e.target.value })
                  }
                  className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  placeholder='Ej. Criadero San José, Traba El Roble'
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
                  className='bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition'
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
