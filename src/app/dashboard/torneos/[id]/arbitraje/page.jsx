'use client'

import { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Award,
  Tv,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Swords,
  XCircle,
  Loader2,
} from 'lucide-react'

export default function ArbitrajeLivePage({ params }) {
  const { id: torneoId } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [navegandoAtras, setNavegandoAtras] = useState(false)

  const [torneo, setTorneo] = useState(null)
  const [peleas, setPeleas] = useState([])
  const [peleaSeleccionada, setPeleaSeleccionada] = useState(null)
  const [tiempoMs, setTiempoMs] = useState(0)
  const [corriendo, setCorriendo] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const timerRef = useRef(null)

  const cargarDatos = async () => {
    const { data: tData } = await supabase
      .from('torneos')
      .select('*')
      .eq('id', torneoId)
      .single()
    const { data: pData } = await supabase
      .from('peleas')
      .select('*, gallo_azul:gallo_azul_id(*), gallo_rojo:gallo_rojo_id(*)')
      .eq('torneo_id', torneoId)
      .order('numero_pelea', { ascending: true })

    if (tData) setTorneo(tData)
    if (pData && pData.length > 0) {
      setPeleas(pData)
      if (!peleaSeleccionada) {
        const actual =
          (tData?.pelea_activa_id
            ? pData.find((p) => p.id === tData.pelea_activa_id)
            : null) ||
          pData.find((p) => p.resultado === 'pendiente') ||
          pData[0]
        seleccionarPelea(actual)
      } else {
        const actualizada = pData.find((p) => p.id === peleaSeleccionada.id)
        if (actualizada) {
          setPeleaSeleccionada(actualizada)
        }
      }
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    cargarDatos()
  }, [torneoId])

  useEffect(() => {
    if (corriendo) {
      const startTime = Date.now() - tiempoMs
      timerRef.current = setInterval(() => {
        setTiempoMs(Date.now() - startTime)
      }, 30)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [corriendo])

  const cambiarModoPantalla = async (modo) => {
    const { error } = await supabase
      .from('torneos')
      .update({ vista_arena: modo })
      .eq('id', torneoId)
    if (!error) {
      setTorneo((prev) => ({ ...prev, vista_arena: modo }))
    }
  }

  const seleccionarPelea = async (p) => {
    setPeleaSeleccionada(p)
    setTiempoMs(Number(p.duracion_milisegundos) || 0)
    setObservaciones(p.observaciones || '')
    setCorriendo(p.estado_transmision === 'en_curso')

    await supabase
      .from('torneos')
      .update({ pelea_activa_id: p.id, vista_arena: 'combate' })
      .eq('id', torneoId)
  }

  const syncPeleaRealtime = async (estado, ms) => {
    if (!peleaSeleccionada) return
    await supabase
      .from('peleas')
      .update({
        estado_transmision: estado,
        duracion_milisegundos: ms,
      })
      .eq('id', peleaSeleccionada.id)
  }

  const handleIniciarCronometro = () => {
    setCorriendo(true)
    syncPeleaRealtime('en_curso', tiempoMs)
  }

  const handlePausarCronometro = () => {
    setCorriendo(false)
    syncPeleaRealtime('pausado', tiempoMs)
  }

  const handleReiniciarCronometro = () => {
    setCorriendo(false)
    setTiempoMs(0)
    syncPeleaRealtime('en_espera', 0)
  }

  // Dictaminar o cambiar fallo (toggle si se pulsa el mismo)
  const handleDictaminarFallo = async (resultado, ganadorId = null) => {
    if (peleaSeleccionada?.resultado === resultado) {
      // Si ya estaba seleccionado ese mismo resultado, se anula y regresa a pendiente
      await handleAnularFallo()
      return
    }

    setCorriendo(false)
    const segsTotal = Math.floor(tiempoMs / 1000)

    const payload = {
      resultado: resultado,
      ganador_id: ganadorId,
      duracion_milisegundos: tiempoMs,
      duracion_segundos: segsTotal,
      estado_transmision: 'finalizado',
      observaciones: observaciones ? observaciones.trim().toUpperCase() : '',
    }

    const { error } = await supabase
      .from('peleas')
      .update(payload)
      .eq('id', peleaSeleccionada.id)

    if (!error) {
      setPeleaSeleccionada((prev) => ({ ...prev, ...payload }))
      await cargarDatos()
    } else {
      alert('Error al registrar fallo: ' + error.message)
    }
  }

  // Anular completamente el resultado y regresar la pelea a estado pendiente
  const handleAnularFallo = async () => {
    const payload = {
      resultado: 'pendiente',
      ganador_id: null,
      estado_transmision: 'en_espera',
    }

    const { error } = await supabase
      .from('peleas')
      .update(payload)
      .eq('id', peleaSeleccionada.id)

    if (!error) {
      setPeleaSeleccionada((prev) => ({ ...prev, ...payload }))
      await cargarDatos()
    } else {
      alert('Error al anular fallo: ' + error.message)
    }
  }

  const formatearTiempo = (ms) => {
    const totalSegundos = Math.floor(ms / 1000)
    const minutos = Math.floor(totalSegundos / 60)
    const segundos = totalSegundos % 60
    const centesimas = Math.floor((ms % 1000) / 10)

    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')},${centesimas.toString().padStart(2, '0')}`
  }

  const indiceActual = peleas.findIndex((p) => p.id === peleaSeleccionada?.id)
  const gAzul = peleaSeleccionada?.gallo_azul
  const gRojo = peleaSeleccionada?.gallo_rojo
  const tieneResultado =
    peleaSeleccionada?.resultado && peleaSeleccionada.resultado !== 'pendiente'

  return (
    <div className='max-w-2xl mx-auto space-y-5 pb-12'>
      {/* Overlay de navegación en proceso */}
      {navegandoAtras && (
        <div className='fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3'>
          <Loader2 className='w-10 h-10 text-amber-500 animate-spin' />
          <span className='text-xs font-bold text-slate-300 uppercase tracking-widest'>
            Regresando a Cartelera...
          </span>
        </div>
      )}

      {/* Header */}
      <div className='flex items-center justify-between border-b border-slate-800 pb-3'>
        <button
          onClick={() => {
            setNavegandoAtras(true)
            router.push(`/dashboard/torneos/${torneoId}`)
          }}
          disabled={navegandoAtras}
          className='cursor-pointer text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1.5 transition disabled:opacity-50'
        >
          {navegandoAtras ? (
            <Loader2 size={14} className='animate-spin' />
          ) : (
            <ArrowLeft size={14} />
          )}
          <span>{navegandoAtras ? 'Cargando...' : 'Volver a Cartelera'}</span>
        </button>

        <Link
          href={`/arena/${torneoId}`}
          target='_blank'
          className='cursor-pointer bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500 hover:text-slate-950 transition'
        >
          <Tv size={13} /> Abrir Pantalla Arena (TV)
        </Link>
      </div>

      {/* Control Maestro de la Pantalla de TV */}
      <div className='bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between'>
        <span className='text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 pl-2'>
          <Tv size={16} className='text-amber-500' /> Proyección en TV:
        </span>
        <div className='flex gap-2'>
          <button
            onClick={() => cambiarModoPantalla('combate')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              torneo?.vista_arena !== 'premiacion'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords size={13} /> Combate en Vivo
          </button>
          <button
            onClick={() => cambiarModoPantalla('premiacion')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              torneo?.vista_arena === 'premiacion'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy size={13} /> Tabla de Premiación
          </button>
        </div>
      </div>

      {/* Selector de Pelea */}
      <div className='bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between'>
        <button
          disabled={indiceActual <= 0}
          onClick={() => seleccionarPelea(peleas[indiceActual - 1])}
          className='p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 transition'
        >
          <ChevronLeft size={20} />
        </button>

        <div className='text-center flex-1 px-4'>
          <span className='text-[10px] font-bold uppercase tracking-widest text-slate-400 block'>
            CONTROL DE COMBATE
          </span>
          <h2 className='text-xl font-black text-amber-400'>
            PELEA #{peleaSeleccionada?.numero_pelea || '0'} DE {peleas.length}
          </h2>
          <p className='text-xs text-slate-300 font-bold truncate mt-0.5'>
            {gRojo?.nombre_equipo} vs {gAzul?.nombre_equipo}
          </p>
        </div>

        <button
          disabled={indiceActual >= peleas.length - 1}
          onClick={() => seleccionarPelea(peleas[indiceActual + 1])}
          className='p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-200 transition'
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Cronómetro Control */}
      <div className='bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center space-y-4 shadow-xl'>
        <span className='text-xs font-bold uppercase text-slate-400 tracking-widest'>
          Cronómetro de Arena
        </span>
        <div className='text-5xl font-mono font-black text-amber-400 tracking-wider'>
          {formatearTiempo(tiempoMs)}
        </div>

        <div className='flex justify-center gap-3'>
          {!corriendo ? (
            <button
              onClick={handleIniciarCronometro}
              className='flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20'
            >
              <Play size={18} fill='currentColor' /> Iniciar Tiempo
            </button>
          ) : (
            <button
              onClick={handlePausarCronometro}
              className='flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20'
            >
              <Pause size={18} fill='currentColor' /> Pausar Tiempo
            </button>
          )}

          <button
            onClick={handleReiniciarCronometro}
            className='p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition'
            title='Reiniciar a 00:00,00'
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Dictamen de Ganadores */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <label className='text-xs font-black uppercase tracking-wider text-slate-400'>
            Declarar Ganador del Combate
          </label>

          {tieneResultado && (
            <button
              onClick={handleAnularFallo}
              className='text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg transition'
            >
              <XCircle size={13} /> Anular Fallo / Quitar Resultado
            </button>
          )}
        </div>

        <div className='grid grid-cols-2 gap-3'>
          {/* Botón Ganador Rojo */}
          <button
            onClick={() => handleDictaminarFallo('rojo_gano', gRojo?.id)}
            className={`p-4 rounded-2xl border-2 text-left transition ${
              peleaSeleccionada?.resultado === 'rojo_gano'
                ? 'bg-red-950/80 border-red-500 ring-2 ring-red-400'
                : 'bg-red-950/30 border-red-900/40 hover:bg-red-950/60'
            }`}
          >
            <span className='text-[10px] font-black text-red-400 uppercase tracking-wider block'>
              CUERDA ROJA
            </span>
            <p className='font-black text-white text-base truncate mt-0.5'>
              {gRojo?.nombre_equipo}
            </p>
            <p className='text-xs text-red-200/80'>
              Aro: {gRojo?.numero_anillo} • {gRojo?.peso_libras}lb{' '}
              {Number(gRojo?.peso_onzas || 0).toFixed(2)}oz
            </p>
            <div className='mt-2 text-xs font-bold text-red-400 flex items-center gap-1'>
              <Award size={14} /> Ganador Rojo
            </div>
          </button>

          {/* Botón Ganador Azul */}
          <button
            onClick={() => handleDictaminarFallo('azul_gano', gAzul?.id)}
            className={`p-4 rounded-2xl border-2 text-left transition ${
              peleaSeleccionada?.resultado === 'azul_gano'
                ? 'bg-blue-950/80 border-blue-500 ring-2 ring-blue-400'
                : 'bg-blue-950/30 border-blue-900/40 hover:bg-blue-950/60'
            }`}
          >
            <span className='text-[10px] font-black text-blue-400 uppercase tracking-wider block'>
              CUERDA AZUL
            </span>
            <p className='font-black text-white text-base truncate mt-0.5'>
              {gAzul?.nombre_equipo}
            </p>
            <p className='text-xs text-blue-200/80'>
              Aro: {gAzul?.numero_anillo} • {gAzul?.peso_libras}lb{' '}
              {Number(gAzul?.peso_onzas || 0).toFixed(2)}oz
            </p>
            <div className='mt-2 text-xs font-bold text-blue-400 flex items-center gap-1'>
              <Award size={14} /> Ganador Azul
            </div>
          </button>
        </div>

        {/* Fallos Alternativos */}
        <div className='grid grid-cols-3 gap-2'>
          <button
            onClick={() => handleDictaminarFallo('tabla')}
            className={`py-2.5 rounded-xl border text-xs font-bold transition ${
              peleaSeleccionada?.resultado === 'tabla'
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Tabla (Empate)
          </button>

          <button
            onClick={() => handleDictaminarFallo('descasada')}
            className={`py-2.5 rounded-xl border text-xs font-bold transition ${
              peleaSeleccionada?.resultado === 'descasada'
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Descasada
          </button>

          <button
            onClick={() => handleDictaminarFallo('no_apta')}
            className={`py-2.5 rounded-xl border text-xs font-bold transition ${
              peleaSeleccionada?.resultado === 'no_apta'
                ? 'bg-slate-700 border-slate-500 text-slate-200'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            No Apta
          </button>
        </div>

        {/* Observaciones */}
        <div className='pt-2'>
          <input
            type='text'
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className='w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 uppercase'
            placeholder='Observaciones de la pelea...'
          />
        </div>
      </div>
    </div>
  )
}
