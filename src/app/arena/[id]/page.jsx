'use client'

import { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

export default function ArenaScreenPage({ params }) {
  const { id: torneoId } = use(params)
  const supabase = createClient()

  const [torneo, setTorneo] = useState(null)
  const [peleas, setPeleas] = useState([])
  const [ranking, setRanking] = useState([])
  const [peleaActiva, setPeleaActiva] = useState(null)
  const [tiempoMs, setTiempoMs] = useState(0)
  const [corriendo, setCorriendo] = useState(false)

  const timerRef = useRef(null)
  const peleaActivaRef = useRef(null)

  useEffect(() => {
    peleaActivaRef.current = peleaActiva
  }, [peleaActiva])

  const formatearTiempo = (ms) => {
    if (!ms || ms === 0) return '00:00,00'
    const totalSegundos = Math.floor(ms / 1000)
    const minutos = Math.floor(totalSegundos / 60)
    const segundos = totalSegundos % 60
    const centesimas = Math.floor((ms % 1000) / 10)

    const mm = minutos.toString().padStart(2, '0')
    const ss = segundos.toString().padStart(2, '0')
    const cs = centesimas.toString().padStart(2, '0')

    return `${mm}:${ss},${cs}`
  }

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

      // 1. Calcular Ranking para la tabla de resultados
      const victorias = []
      pData.forEach((p) => {
        if (p.resultado === 'azul_gano' && p.gallo_azul) {
          victorias.push({
            peleaNumero: p.numero_pelea,
            equipo: p.gallo_azul.nombre_equipo,
            aro: p.gallo_azul.numero_anillo,
            tiempoMs:
              Number(p.duracion_milisegundos) ||
              (p.duracion_segundos ? p.duracion_segundos * 1000 : 0),
          })
        } else if (p.resultado === 'rojo_gano' && p.gallo_rojo) {
          victorias.push({
            peleaNumero: p.numero_pelea,
            equipo: p.gallo_rojo.nombre_equipo,
            aro: p.gallo_rojo.numero_anillo,
            tiempoMs:
              Number(p.duracion_milisegundos) ||
              (p.duracion_segundos ? p.duracion_segundos * 1000 : 0),
          })
        }
      })
      victorias.sort((a, b) => a.tiempoMs - b.tiempoMs)
      setRanking(victorias)

      // 2. Determinar Pelea Activa
      const peleaSeleccionada =
        (tData?.pelea_activa_id
          ? pData.find((p) => p.id === tData.pelea_activa_id)
          : null) ||
        pData.find(
          (p) =>
            p.estado_transmision === 'en_curso' ||
            p.estado_transmision === 'pausado',
        ) ||
        pData.find((p) => p.resultado === 'pendiente') ||
        pData[0]

      setPeleaActiva(peleaSeleccionada)
      if (peleaSeleccionada?.duracion_milisegundos !== undefined) {
        setTiempoMs(Number(peleaSeleccionada.duracion_milisegundos) || 0)
      }
      setCorriendo(peleaSeleccionada?.estado_transmision === 'en_curso')
    }
  }

  useEffect(() => {
    cargarDatos()

    const channelPeleas = supabase
      .channel(`arena_peleas_${torneoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'peleas',
          filter: `torneo_id=eq.${torneoId}`,
        },
        async () => {
          await cargarDatos()
        },
      )
      .subscribe()

    const channelTorneo = supabase
      .channel(`arena_torneo_${torneoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'torneos',
          filter: `id=eq.${torneoId}`,
        },
        async () => {
          await cargarDatos()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelPeleas)
      supabase.removeChannel(channelTorneo)
    }
  }, [torneoId])

  // Cronómetro
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

  const gAzul = peleaActiva?.gallo_azul
  const gRojo = peleaActiva?.gallo_rojo
  const numeroPeleaFormateado = peleaActiva
    ? String(peleaActiva.numero_pelea).padStart(2, '0')
    : '01'
  const totalPeleasFormateado = String(peleas.length).padStart(2, '0')

  const esGanadorRojo = peleaActiva?.resultado === 'rojo_gano'
  const esGanadorAzul = peleaActiva?.resultado === 'azul_gano'
  const esTabla = peleaActiva?.resultado === 'tabla'
  const esDescasada = peleaActiva?.resultado === 'descasada'
  const esNoApta = peleaActiva?.resultado === 'no_apta'
  const hayGanador = esGanadorRojo || esGanadorAzul
  const hayFalloEspecial = esTabla || esDescasada || esNoApta
  const esProximoCombate =
    peleaActiva?.resultado === 'pendiente' && !corriendo && tiempoMs === 0

  // ==========================================
  // VISTA 1: TABLA DE RESULTADOS / PREMIACIÓN
  // ==========================================
  if (torneo?.vista_arena === 'premiacion') {
    const premios = [
      { lugar: 1, premio: 'MOTO 0KM + COPA' },
      { lugar: 2, premio: '$800' },
      { lugar: 3, premio: '$500' },
      { lugar: 4, premio: '$300' },
      { lugar: 5, premio: '$200' },
    ]

    return (
      <div className='h-screen w-screen bg-[#f7f5ed] text-slate-900 flex flex-col justify-between p-6 select-none font-sans overflow-hidden border-[8px] border-[#997738] animate-in fade-in duration-500'>
        <header className='flex items-center justify-between border-b-4 border-[#997738] pb-3 mb-2'>
          <div>
            <h1 className='text-6xl xl:text-7xl font-black italic tracking-tighter text-[#991b1b] uppercase drop-shadow-sm font-serif'>
              PREMIACIÓN OFICIAL
            </h1>
            <p className='text-2xl xl:text-3xl font-black italic tracking-wider text-[#997738] uppercase mt-0.5'>
              {torneo?.nombre || 'GRAN TORNEO OFICIAL'}
            </p>
          </div>

          <div className='relative w-44 h-24 flex-shrink-0'>
            <Image
              src='/logo-mi-querencia.png'
              alt='Centro Agroturístico Mi Querencia'
              fill
              className='object-contain'
              priority
            />
          </div>
        </header>

        <main className='flex-1 flex flex-col justify-center max-w-6xl w-full mx-auto my-1'>
          <div className='bg-white rounded-3xl border-4 border-[#5c6947] overflow-hidden shadow-2xl'>
            <table className='w-full text-left border-collapse'>
              <thead>
                <tr className='bg-[#5c6947] text-white text-xl xl:text-2xl font-black uppercase tracking-wider text-center'>
                  <th className='py-2.5 px-4 w-24 border-r border-[#4d593b]'>
                    Lugar
                  </th>
                  <th className='py-2.5 px-6 text-left border-r border-[#4d593b]'>
                    Gallería / Equipo
                  </th>
                  <th className='py-2.5 px-6 w-48 border-r border-[#4d593b]'>
                    Tiempo
                  </th>
                  <th className='py-2.5 px-6 w-64'>Premio</th>
                </tr>
              </thead>
              <tbody className='divide-y-2 divide-[#e5e7eb] font-bold text-lg xl:text-xl'>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const item = ranking[idx]
                  const lugarNum = idx + 1
                  const premioConfig = premios.find((p) => p.lugar === lugarNum)

                  return (
                    <tr
                      key={idx}
                      className={`text-center transition ${
                        idx % 2 === 0 ? 'bg-[#fcfbf7]' : 'bg-[#f4f1e6]'
                      }`}
                    >
                      <td className='py-2.5 px-4 font-black text-2xl text-[#5c6947] border-r-2 border-[#e5e7eb]'>
                        {lugarNum}
                      </td>
                      <td className='py-2.5 px-6 text-left uppercase font-black text-slate-900 border-r-2 border-[#e5e7eb]'>
                        {item ? (
                          <span>
                            {item.equipo}{' '}
                            <span className='text-sm font-normal text-slate-500'>
                              (Aro {item.aro})
                            </span>
                          </span>
                        ) : (
                          <span className='text-slate-400 font-normal italic'>
                            Por Definir
                          </span>
                        )}
                      </td>
                      <td className='py-2.5 px-6 font-mono font-black text-2xl text-[#991b1b] border-r-2 border-[#e5e7eb]'>
                        {item ? formatearTiempo(item.tiempoMs) : '--:--,---'}
                      </td>
                      <td className='py-2.5 px-6 font-black text-[#991b1b] uppercase tracking-wide'>
                        {premioConfig?.premio || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className='bg-[#ede9dc] border-t-4 border-[#5c6947] p-3 text-xs xl:text-sm font-bold text-slate-800 grid grid-cols-2 gap-x-8 gap-y-1'>
              <div className='flex justify-between border-b border-slate-300 pb-0.5'>
                <span>ARMADOR 1ER. LUGAR:</span>
                <span className='text-[#991b1b] font-black'>$120</span>
              </div>
              <div className='flex justify-between border-b border-slate-300 pb-0.5'>
                <span>ARMADOR 4TO. LUGAR:</span>
                <span className='text-[#991b1b] font-black'>$50</span>
              </div>
              <div className='flex justify-between border-b border-slate-300 pb-0.5'>
                <span>ARMADOR 2DO. LUGAR:</span>
                <span className='text-[#991b1b] font-black'>$100</span>
              </div>
              <div className='flex justify-between border-b border-slate-300 pb-0.5'>
                <span>ARMADOR 5TO. LUGAR:</span>
                <span className='text-[#991b1b] font-black'>$30</span>
              </div>
              <div className='flex justify-between border-b border-slate-300 pb-0.5'>
                <span>ARMADOR 3ER. LUGAR:</span>
                <span className='text-[#991b1b] font-black'>$80</span>
              </div>
              <div className='flex justify-between border-b border-slate-300 pb-0.5'>
                <span>GANADOR PRIMERA PELEA:</span>
                <span className='text-[#991b1b] font-black'>$100</span>
              </div>
            </div>
          </div>
        </main>

        <footer className='flex items-center justify-between border-t-2 border-[#997738] pt-2 text-xs xl:text-sm font-bold text-slate-600'>
          <div className='flex items-center gap-2'>
            <span className='w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping' />
            <span>RESULTADOS EN TIEMPO REAL • FALCÓN, VENEZUELA 🇻🇪</span>
          </div>
          <div className='text-[#997738] font-black uppercase tracking-widest'>
            CENTRO AGROTURÍSTICO MI QUERENCIA
          </div>
        </footer>
      </div>
    )
  }

  // ==========================================
  // VISTA 2: COMBATE EN RUEDO (POR DEFECTO)
  // ==========================================
  return (
    <div className='h-screen w-screen bg-black text-white flex flex-col justify-between select-none overflow-hidden font-sans border-[6px] border-[#997738] animate-in fade-in duration-500'>
      {/* 1. Encabezado Oficial */}
      <header className='relative bg-gradient-to-b from-[#fbf8ee] via-[#ede4cb] to-[#d6c39a] text-slate-950 px-10 py-4 border-b-[5px] border-[#997738] flex items-center justify-between shadow-2xl z-30'>
        <div className='hidden lg:flex items-center gap-2'>
          <div className='w-16 h-4 bg-gradient-to-r from-[#997738] to-[#d8b467] rounded-sm transform skew-x-[-25deg]' />
          <div className='w-5 h-4 bg-[#997738] rounded-sm transform skew-x-[-25deg]' />
        </div>

        <div className='text-center flex-1'>
          {esProximoCombate ? (
            <span className='inline-block bg-[#997738] text-white text-sm font-black px-4 py-0.5 rounded-full uppercase tracking-widest mb-1 animate-pulse'>
              PRÓXIMO ENTRANDO AL RUEDO
            </span>
          ) : null}
          <h1 className='text-6xl xl:text-7xl font-black italic tracking-tighter uppercase drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)] text-[#1a140a]'>
            PELEA NRO. {numeroPeleaFormateado}
          </h1>
          <p className='text-xl xl:text-2xl font-black italic tracking-widest text-[#7a591e] uppercase mt-0.5'>
            {torneo?.nombre || 'INAUGURACIÓN MI QUERENCIA'}
          </p>
        </div>

        <div className='relative w-32 h-20 xl:w-40 xl:h-24 flex-shrink-0'>
          <Image
            src='/logo-mi-querencia.png'
            alt='Centro Agroturístico Mi Querencia'
            fill
            className='object-contain'
            priority
          />
        </div>
      </header>

      {/* 2. Área Central del Combate */}
      <main className='flex-1 grid grid-cols-2 relative'>
        {/* Cartel Flotante Central de Fallos Especiales */}
        {hayFalloEspecial && (
          <div className='absolute inset-0 flex items-center justify-center z-40 pointer-events-none'>
            <div className='bg-gradient-to-b from-[#1c1917] via-[#0c0a09] to-[#000000] border-4 border-amber-400 px-12 py-6 rounded-3xl shadow-[0_0_80px_rgba(251,191,36,0.6)] text-center animate-pulse'>
              <span className='block text-xs uppercase font-bold tracking-[0.3em] text-slate-400 mb-1'>
                FALLO OFICIAL DE LA MESA
              </span>
              <h3 className='text-5xl xl:text-6xl font-black italic tracking-widest uppercase text-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]'>
                {esTabla && 'TABLA (EMPATE)'}
                {esDescasada && 'DESCASADA'}
                {esNoApta && 'NO APTA'}
              </h3>
            </div>
          </div>
        )}

        {/* CUERDA ROJA (Izquierda) */}
        <div
          className={`flex flex-col justify-center items-center text-center p-6 border-r-[4px] border-black/80 transition-all duration-500 relative ${
            esGanadorRojo
              ? 'bg-gradient-to-br from-[#990c0c] via-[#cc1414] to-[#ff2626] ring-8 ring-amber-400 z-20 scale-[1.02] shadow-[0_0_80px_rgba(239,68,68,0.6)]'
              : hayGanador
                ? 'opacity-20 blur-[1.5px] grayscale-[80%] bg-[#2b0202]'
                : hayFalloEspecial
                  ? 'opacity-60 bg-gradient-to-br from-[#450505] to-[#240202]'
                  : 'bg-gradient-to-br from-[#590404] via-[#850b0b] to-[#a30f0f]'
          }`}
        >
          <h2 className='text-4xl xl:text-5xl font-black italic tracking-wider text-white uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] mb-4 border-b-4 border-white/20 pb-2 w-3/4'>
            CUERDA ROJA
          </h2>

          <div className='space-y-3 max-w-xl w-full'>
            <p className='text-5xl xl:text-6xl font-black uppercase text-white tracking-tight drop-shadow-[0_6px_6px_rgba(0,0,0,0.9)] truncate'>
              {gRojo?.nombre_equipo || '---'}
            </p>

            <p className='text-3xl xl:text-4xl font-black text-amber-300 tracking-wider drop-shadow-md'>
              ARO: {gRojo?.numero_anillo || '---'}
            </p>

            <p className='text-3xl xl:text-4xl font-black text-amber-200 tracking-wider drop-shadow-md'>
              {gRojo?.peso_libras} LB{' '}
              {Number(gRojo?.peso_onzas || 0).toFixed(2)} OZ
            </p>

            <div className='mt-2 bg-black/40 py-2.5 px-6 rounded-2xl border border-white/10 inline-block'>
              <span className='block text-xs xl:text-sm font-bold tracking-widest text-amber-400 uppercase'>
                {gRojo?.placa_amv && gRojo?.placa_amv !== 'S/P'
                  ? 'PLACA AMV'
                  : 'MARCA'}
              </span>
              <span className='block text-2xl xl:text-3xl font-black text-white tracking-wider'>
                {gRojo?.placa_amv && gRojo?.placa_amv !== 'S/P'
                  ? `${gRojo?.marca_amv || `M${gRojo?.marca || 0}`} (AMV-${gRojo?.placa_amv.replace(/^AMV-?/i, '')})`
                  : gRojo?.marca_amv || `M${gRojo?.marca || 0}`}
              </span>
            </div>
          </div>

          {esGanadorRojo && (
            <div className='mt-6 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-black font-black text-4xl px-10 py-3 rounded-2xl uppercase tracking-widest shadow-[0_0_40px_rgba(251,191,36,0.9)] border-4 border-white animate-bounce'>
              🏆 GANADOR
            </div>
          )}
        </div>

        {/* CUERDA AZUL (Derecha) */}
        <div
          className={`flex flex-col justify-center items-center text-center p-6 transition-all duration-500 relative ${
            esGanadorAzul
              ? 'bg-gradient-to-br from-[#0a3699] via-[#1253e0] to-[#2b6eff] ring-8 ring-amber-400 z-20 scale-[1.02] shadow-[0_0_80px_rgba(59,130,246,0.6)]'
              : hayGanador
                ? 'opacity-20 blur-[1.5px] grayscale-[80%] bg-[#02102b]'
                : hayFalloEspecial
                  ? 'opacity-60 bg-gradient-to-br from-[#041338] to-[#02091c]'
                  : 'bg-gradient-to-br from-[#051c52] via-[#092b78] to-[#0e3ea6]'
          }`}
        >
          <h2 className='text-4xl xl:text-5xl font-black italic tracking-wider text-white uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] mb-4 border-b-4 border-white/20 pb-2 w-3/4'>
            CUERDA AZUL
          </h2>

          <div className='space-y-3 max-w-xl w-full'>
            <p className='text-5xl xl:text-6xl font-black uppercase text-white tracking-tight drop-shadow-[0_6px_6px_rgba(0,0,0,0.9)] truncate'>
              {gAzul?.nombre_equipo || '---'}
            </p>

            <p className='text-3xl xl:text-4xl font-black text-amber-300 tracking-wider drop-shadow-md'>
              ARO: {gAzul?.numero_anillo || '---'}
            </p>

            <p className='text-3xl xl:text-4xl font-black text-amber-200 tracking-wider drop-shadow-md'>
              {gAzul?.peso_libras} LB{' '}
              {Number(gAzul?.peso_onzas || 0).toFixed(2)} OZ
            </p>

            <div className='mt-2 bg-black/40 py-2.5 px-6 rounded-2xl border border-white/10 inline-block'>
              <span className='block text-xs xl:text-sm font-bold tracking-widest text-amber-400 uppercase'>
                {gAzul?.placa_amv && gAzul?.placa_amv !== 'S/P'
                  ? 'PLACA AMV'
                  : 'MARCA'}
              </span>
              <span className='block text-2xl xl:text-3xl font-black text-white tracking-wider'>
                {gAzul?.placa_amv && gAzul?.placa_amv !== 'S/P'
                  ? `${gAzul?.marca_amv || `M${gAzul?.marca || 0}`} (AMV-${gAzul?.placa_amv.replace(/^AMV-?/i, '')})`
                  : gAzul?.marca_amv || `M${gAzul?.marca || 0}`}
              </span>
            </div>
          </div>

          {esGanadorAzul && (
            <div className='mt-6 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-black font-black text-4xl px-10 py-3 rounded-2xl uppercase tracking-widest shadow-[0_0_40px_rgba(251,191,36,0.9)] border-4 border-white animate-bounce'>
              🏆 GANADOR
            </div>
          )}
        </div>
      </main>

      {/* 3. Barra Inferior */}
      <footer className='bg-[#0c0d0e] border-t-[5px] border-[#997738] py-3.5 px-10 flex items-center justify-between z-30'>
        <div className='text-2xl xl:text-3xl font-black italic tracking-widest text-[#f5ebd2] uppercase'>
          PELEA {numeroPeleaFormateado} DE {totalPeleasFormateado}
        </div>

        <div className='flex items-center gap-3 bg-black/80 px-5 py-1.5 rounded-2xl border-2 border-[#997738]/60 shadow-inner'>
          <span className='text-amber-500 font-bold text-sm xl:text-base tracking-widest uppercase'>
            TIEMPO:
          </span>
          <span className='font-mono text-3xl xl:text-4xl font-black text-amber-400 tracking-wider'>
            {formatearTiempo(tiempoMs)}
          </span>
        </div>

        <div className='flex items-center gap-3'>
          <span className='text-xl xl:text-2xl font-black italic tracking-widest text-[#d6c39a] uppercase'>
            FALCÓN • VENEZUELA
          </span>
          <span className='text-2xl'>🇻🇪</span>
        </div>
      </footer>
    </div>
  )
}
