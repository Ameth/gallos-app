'use client'

import { useState, useEffect, use, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generarCotejoAutomatico } from '@/lib/cotejador'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Scale,
  Plus,
  Trash2,
  ArrowLeft,
  Swords,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Award,
  BarChart3,
  Edit2,
  FileDown,
} from 'lucide-react'
import Link from 'next/link'

export default function TorneoDetallePage({ params }) {
  const { id: torneoId } = use(params)
  const supabase = createClient()

  const [torneo, setTorneo] = useState(null)
  const [inscripciones, setInscripciones] = useState([])
  const [peleas, setPeleas] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('cotejo')

  // Modal Pesaje (Creación / Edición)
  const [showModal, setShowModal] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState({
    numero_anillo: '',
    nombre_equipo: '',
    color_pluma: '',
    peso_libras: 3,
    peso_onzas: 0,
    comodines: '',
    tipo_espuela: 'Libre',
    marca_amv: 'M0',
    placa_amv: '',
    observaciones: '',
  })

  // Modal Casamiento Manual
  const [galloSeleccionadoManual, setGalloSeleccionadoManual] = useState(null)
  const [rivalSeleccionadoManual, setRivalSeleccionadoManual] = useState(null)

  // Control de Combate en Vivo (Arbitraje)
  const [peleaEnArbitraje, setPeleaEnArbitraje] = useState(null)
  const [segundosCombate, setSegundosCombate] = useState(0)
  const [cronometroActivo, setCronometroActivo] = useState(false)
  const [observacionesPelea, setObservacionesPelea] = useState('')
  const timerRef = useRef(null)

  const cargarDatos = async () => {
    setLoading(true)

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    cargarDatos()
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

  const formatoTiempo = (totalSegs) => {
    const mins = Math.floor(totalSegs / 60)
    const segs = totalSegs % 60
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`
  }

  // Exportar Listado Oficial de Cotejos a PDF con Agrupación por Combate
  const handleExportarPDF = () => {
    if (peleas.length === 0) {
      alert('No hay peleas armadas para exportar.')
      return
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter',
    })

    // Encabezado Institucional
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('CENTRO TURÍSTICO MI QUERENCIA', 14, 15)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `PROGRAMACIÓN OFICIAL DE COMBATES - ${torneo?.nombre?.toUpperCase() || 'TORNEO'}`,
      14,
      21,
    )

    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(
      `Fecha del Evento: ${torneo?.fecha || 'N/A'}  |  Total de Peleas: ${peleas.length}`,
      14,
      26,
    )

    // Armar filas de la tabla con agrupación de celda (rowSpan)
    const filasTabla = []

    peleas.forEach((pelea) => {
      const gAzul = pelea.gallo_azul
      const gRojo = pelea.gallo_blanco

      // Fila 1: Esquina Azul (Incluye la celda agrupada con rowSpan: 2)
      filasTabla.push([
        {
          content: `Pelea #${pelea.numero_pelea}`,
          rowSpan: 2,
          styles: {
            halign: 'center',
            valign: 'middle',
            fontStyle: 'bold',
            fillColor: [245, 247, 250],
          },
        },
        gAzul.numero_anillo || '-',
        `${gAzul.nombre_equipo || '-'} (AZUL)`,
        gAzul.color_pluma || '-',
        gAzul.peso_libras ?? '-',
        Number(gAzul.peso_onzas || 0).toFixed(2),
        gAzul.comodines && gAzul.comodines.length > 0
          ? gAzul.comodines.join(', ')
          : 'NINGUNO',
        gAzul.tipo_espuela || 'Libre',
        gAzul.marca_amv || `M${gAzul.marca || 0}`,
        gAzul.placa_amv || 'S/P',
        gAzul.observaciones || '-',
      ])

      // Fila 2: Esquina Roja (No lleva la columna 0 porque ya la ocupa el rowSpan)
      filasTabla.push([
        gRojo.numero_anillo || '-',
        `${gRojo.nombre_equipo || '-'} (ROJO)`,
        gRojo.color_pluma || '-',
        gRojo.peso_libras ?? '-',
        Number(gRojo.peso_onzas || 0).toFixed(2),
        gRojo.comodines && gRojo.comodines.length > 0
          ? gRojo.comodines.join(', ')
          : 'NINGUNO',
        gRojo.tipo_espuela || 'Libre',
        gRojo.marca_amv || `M${gRojo.marca || 0}`,
        gRojo.placa_amv || 'S/P',
        gRojo.observaciones || '-',
      ])
    })

    autoTable(doc, {
      startY: 30,
      head: [
        [
          'N°',
          'Aro',
          'Equipo',
          'Color',
          'Libra',
          'Onza',
          'Comodin',
          'Espuela',
          'Marca AMV',
          'Placa AMV',
          'Observaciones',
        ],
      ],
      body: filasTabla,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.2,
        valign: 'middle',
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
        2: { fontStyle: 'bold', cellWidth: 40 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 14 },
        6: { cellWidth: 28 },
        7: { halign: 'center', cellWidth: 22 },
        8: { halign: 'center', cellWidth: 18 },
        9: { halign: 'center', cellWidth: 20 },
        10: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          // Si es la celda agrupada del N° de pelea, mantenemos su estilo gris neutro
          if (
            data.column.index === 0 &&
            data.cell.raw &&
            typeof data.cell.raw === 'object'
          ) {
            return
          }

          // Colores sutiles por esquina (Fila par = Azul, Fila impar = Rojo)
          if (data.row.index % 2 === 0) {
            data.cell.styles.fillColor = [240, 246, 255] // Azul suave
          } else {
            data.cell.styles.fillColor = [254, 242, 242] // Rojo suave
          }
        }
      },
    })

    const nombreArchivo = `Cotejos_${torneo?.nombre?.replace(/\s+/g, '_') || 'Torneo'}.pdf`
    doc.save(nombreArchivo)
  }

  const abrirModalCrear = () => {
    setEditandoId(null)
    setForm({
      numero_anillo: '',
      nombre_equipo: '',
      color_pluma: '',
      peso_libras: 3,
      peso_onzas: 0,
      comodines: '',
      tipo_espuela: 'Libre',
      marca_amv: 'M0',
      placa_amv: '',
      observaciones: '',
    })
    setShowModal(true)
  }

  const abrirModalEditar = (ins) => {
    setEditandoId(ins.id)
    setForm({
      numero_anillo: ins.numero_anillo || '',
      nombre_equipo: ins.nombre_equipo || '',
      color_pluma: ins.color_pluma || '',
      peso_libras: ins.peso_libras ?? 3,
      peso_onzas: ins.peso_onzas ?? 0,
      comodines: (ins.comodines || []).join(', '),
      tipo_espuela: ins.tipo_espuela || 'Libre',
      marca_amv:
        ins.marca_amv || (ins.marca !== undefined ? `M${ins.marca}` : 'M0'),
      placa_amv: ins.placa_amv || '',
      observaciones: ins.observaciones || '',
    })
    setShowModal(true)
  }

  const abrirMesaArbitraje = (pelea) => {
    setPeleaEnArbitraje(pelea)
    setSegundosCombate(pelea.duracion_segundos || 0)
    setObservacionesPelea(pelea.observaciones || '')
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
        observaciones: observacionesPelea,
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
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean)
      : []

    const marcaNumero = parseInt(form.marca_amv.replace(/\D/g, '')) || 0

    const payload = {
      nombre_equipo: form.nombre_equipo?.trim().toUpperCase(),
      numero_anillo: form.numero_anillo?.trim().toUpperCase(),
      color_pluma: form.color_pluma?.trim().toUpperCase(),
      peso_libras: parseFloat(form.peso_libras) || 0,
      peso_onzas: parseFloat(form.peso_onzas) || 0,
      comodines: arrayComodines,
      tipo_espuela: form.tipo_espuela,
      marca: marcaNumero,
      marca_amv: form.marca_amv?.toUpperCase(),
      placa_amv: form.placa_amv ? form.placa_amv.trim().toUpperCase() : 'S/P',
      observaciones: form.observaciones
        ? form.observaciones.trim().toUpperCase()
        : '',
    }

    if (editandoId) {
      const { error } = await supabase
        .from('inscripciones_pelea')
        .update(payload)
        .eq('id', editandoId)

      if (!error) {
        setShowModal(false)
        setEditandoId(null)
        cargarDatos()
      } else {
        alert('Error al actualizar: ' + error.message)
      }
    } else {
      const { error } = await supabase.from('inscripciones_pelea').insert({
        ...payload,
        torneo_id: torneoId,
        criador_id: user.id,
      })

      if (!error) {
        setShowModal(false)
        cargarDatos()
      } else {
        alert('Error al registrar: ' + error.message)
      }
    }
  }

  const handleDeleteInscripcion = async (id) => {
    if (confirm('¿Deseas eliminar este registro de la mesa de pesaje?')) {
      await supabase.from('inscripciones_pelea').delete().eq('id', id)
      cargarDatos()
    }
  }

  const handleEjecutarCotejoAuto = async () => {
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
        'No se encontraron combinaciones compatibles automáticas. Usa el Casamiento Manual.',
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
    if (!galloSeleccionadoManual || !rivalSeleccionadoManual) return

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
    if (
      confirm(
        '¿Descasar esta pelea? Los gallos volverán a la lista de pendientes.',
      )
    ) {
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

  const opcionesMarcasAMV = [
    { label: 'M0 (Sin marcar)', value: 'M0' },
    ...Array.from({ length: 12 }, (_, idx) => ({
      label: `M${idx + 1}`,
      value: `M${idx + 1}`,
    })),
  ]

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
          <h1 className='text-2xl font-black text-slate-100'>
            {torneo?.nombre || 'Torneo'}
          </h1>
          <p className='text-xs text-slate-400 mt-0.5'>
            Fecha: {torneo?.fecha} • {inscripciones.length} Gallos en Báscula •{' '}
            {peleas.length} Peleas Programadas
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <button
            onClick={abrirModalCrear}
            className='flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs transition border border-slate-700'
          >
            <Plus size={14} /> Registrar en Báscula
          </button>

          <button
            onClick={handleExportarPDF}
            className='flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs transition border border-slate-700'
            title='Descargar cartelera oficial en PDF'
          >
            <FileDown size={14} className='text-amber-400' /> Imprimir /
            Exportar PDF
          </button>

          <button
            onClick={handleEjecutarCotejoAuto}
            className='flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-lg shadow-amber-500/10'
          >
            <Sparkles size={14} /> Ejecutar Cotejo
          </button>
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
          <Swords size={16} /> Cartelera de Peleas ({peleas.length})
        </button>
        <button
          onClick={() => setActiveTab('pesaje')}
          className={`pb-3 font-semibold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'pesaje'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale size={16} /> Mesa de Pesaje ({inscripciones.length})
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
          {gallosPendientes.length > 0 && (
            <div className='bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl'>
              <div className='flex items-center gap-2 text-amber-400 font-bold text-sm mb-3'>
                <AlertTriangle size={18} /> {gallosPendientes.length} Gallos sin
                casar
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
                        {g.peso_libras} Lb{' '}
                        {Number(g.peso_onzas || 0).toFixed(2)} Oz •{' '}
                        {g.placa_amv && g.placa_amv !== 'S/P'
                          ? `(${g.marca_amv || `M${g.marca || 0}`} N•AMV-${g.placa_amv.replace(/^AMV-?/i, '')})`
                          : g.marca_amv || `M${g.marca || 0}`}{' '}
                        • {g.tipo_espuela}
                      </p>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <button
                        onClick={() => abrirModalEditar(g)}
                        className='bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition'
                        title='Editar datos del gallo'
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => setGalloSeleccionadoManual(g)}
                        className='bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] transition'
                      >
                        Casar
                      </button>
                    </div>
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
              <p className='text-slate-500 text-xs mt-1'>
                Presiona "Ejecutar Cotejo" para casar automáticamente o usa el
                casamiento manual.
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
                        <button
                          onClick={() => handleDeletePelea(pelea.id)}
                          className='text-slate-500 hover:text-red-400 transition'
                          title='Descasar pelea'
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Tarjeta de Pelea */}
                    <div className='grid grid-cols-11 gap-2 items-center text-center'>
                      {/* Esquina Azul */}
                      <div
                        className={`col-span-5 p-3 rounded-xl border ${pelea.resultado === 'azul_gano' ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500' : 'bg-blue-950/30 border-blue-900/40'}`}
                      >
                        <span className='text-[10px] font-bold text-blue-400 uppercase tracking-wider block'>
                          Esquina Azul
                        </span>
                        <p className='font-bold text-slate-100 text-sm mt-1'>
                          {pelea.gallo_azul.nombre_equipo}
                        </p>
                        <p className='text-xs text-slate-400'>
                          Aro: {pelea.gallo_azul.numero_anillo} •{' '}
                          {pelea.gallo_azul.color_pluma || 'Pluma N/A'}
                        </p>
                        <p className='text-xs font-bold text-blue-300 mt-1'>
                          {pelea.gallo_azul.peso_libras}{' '}
                          <span className='text-[11px] font-normal text-blue-400/80'>
                            Lb
                          </span>{' '}
                          {Number(pelea.gallo_azul.peso_onzas || 0).toFixed(2)}{' '}
                          <span className='text-[11px] font-normal text-blue-400/80'>
                            Oz
                          </span>
                        </p>
                        <div className='flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-0.5'>
                          <span>
                            {pelea.gallo_azul.placa_amv &&
                            pelea.gallo_azul.placa_amv !== 'S/P'
                              ? `(${pelea.gallo_azul.marca_amv || `M${pelea.gallo_azul.marca || 0}`} N•AMV-${pelea.gallo_azul.placa_amv.replace(/^AMV-?/i, '')})`
                              : pelea.gallo_azul.marca_amv ||
                                `M${pelea.gallo_azul.marca || 0}`}
                          </span>
                          <span>•</span>
                          <span>{pelea.gallo_azul.tipo_espuela}</span>
                        </div>
                        {pelea.resultado === 'azul_gano' && (
                          <span className='inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1'>
                            <Award size={13} /> GANADOR
                          </span>
                        )}
                      </div>

                      <div className='col-span-1 text-slate-500 font-black text-xs'>
                        VS
                      </div>

                      {/* Esquina Roja */}
                      <div
                        className={`col-span-5 p-3 rounded-xl border ${pelea.resultado === 'blanco_gano' ? 'bg-red-950/60 border-red-500 ring-1 ring-red-500' : 'bg-red-950/20 border-red-900/30'}`}
                      >
                        <span className='text-[10px] font-bold text-red-400 uppercase tracking-wider block'>
                          Esquina Roja
                        </span>
                        <p className='font-bold text-slate-100 text-sm mt-1'>
                          {pelea.gallo_blanco.nombre_equipo}
                        </p>
                        <p className='text-xs text-slate-400'>
                          Aro: {pelea.gallo_blanco.numero_anillo} •{' '}
                          {pelea.gallo_blanco.color_pluma || 'Pluma N/A'}
                        </p>
                        <p className='text-xs font-bold text-red-300 mt-1'>
                          {pelea.gallo_blanco.peso_libras}{' '}
                          <span className='text-[11px] font-normal text-red-400/80'>
                            Lb
                          </span>{' '}
                          {Number(pelea.gallo_blanco.peso_onzas || 0).toFixed(
                            2,
                          )}{' '}
                          <span className='text-[11px] font-normal text-red-400/80'>
                            Oz
                          </span>
                        </p>
                        <div className='flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-0.5'>
                          <span>
                            {pelea.gallo_blanco.placa_amv &&
                            pelea.gallo_blanco.placa_amv !== 'S/P'
                              ? `(${pelea.gallo_blanco.marca_amv || `M${pelea.gallo_blanco.marca || 0}`} N•AMV-${pelea.gallo_blanco.placa_amv.replace(/^AMV-?/i, '')})`
                              : pelea.gallo_blanco.marca_amv ||
                                `M${pelea.gallo_blanco.marca || 0}`}
                          </span>
                          <span>•</span>
                          <span>{pelea.gallo_blanco.tipo_espuela}</span>
                        </div>
                        {pelea.resultado === 'blanco_gano' && (
                          <span className='inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1'>
                            <Award size={13} /> GANADOR
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delta de onzas formateado */}
                    <div className='mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs'>
                      <div className='text-slate-400'>
                        {estaTerminada ? (
                          <span className='font-mono text-amber-400'>
                            ⏱ {formatoTiempo(pelea.duracion_segundos)}
                          </span>
                        ) : (
                          <span>Δ {Number(diffPeso || 0).toFixed(2)} oz</span>
                        )}
                      </div>

                      <button
                        onClick={() => abrirMesaArbitraje(pelea)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                          estaTerminada
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md'
                        }`}
                      >
                        <Swords size={13} />{' '}
                        {estaTerminada ? 'Modificar Fallo' : 'Arbitrar Pelea'}
                      </button>
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
            <p className='text-xs text-red-400 uppercase font-semibold'>
              Victorias Roja
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
                <th className='px-3 py-3 w-10 text-center text-slate-500'>#</th>
                <th className='px-4 py-3'>Aro</th>
                <th className='px-4 py-3'>Equipo</th>
                <th className='px-4 py-3'>Pluma</th>
                <th className='px-4 py-3 text-amber-400'>Peso Oficial</th>
                <th className='px-4 py-3'>Espuela</th>
                <th className='px-4 py-3'>Marca AMV</th>
                <th className='px-4 py-3'>Placa AMV</th>
                <th className='px-4 py-3'>Comodines</th>
                <th className='px-4 py-3'>Observaciones</th>
                <th className='px-4 py-3 text-right'>Acciones</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-800'>
              {inscripciones.map((ins, index) => (
                <tr key={ins.id} className='hover:bg-slate-800/40 transition'>
                  <td className='px-3 py-3 text-center font-mono font-bold text-slate-500'>
                    {index + 1}
                  </td>
                  <td className='px-4 py-3 font-mono font-bold text-amber-400'>
                    {ins.numero_anillo}
                  </td>
                  <td className='px-4 py-3 font-bold text-slate-100'>
                    {ins.nombre_equipo}
                  </td>
                  <td className='px-4 py-3'>{ins.color_pluma || 'N/A'}</td>
                  <td className='px-4 py-3 font-bold text-slate-100'>
                    {ins.peso_libras} lb{' '}
                    {Number(ins.peso_onzas || 0).toFixed(2)} oz
                  </td>
                  <td className='px-4 py-3'>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ins.tipo_espuela === 'Pollo marcado'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {ins.tipo_espuela}
                    </span>
                  </td>
                  <td className='px-4 py-3 font-bold text-slate-200'>
                    {ins.marca_amv || `M${ins.marca}`}
                  </td>
                  <td className='px-4 py-3 font-mono'>
                    {ins.placa_amv || 'S/P'}
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
                  <td className='px-4 py-3 text-slate-400 max-w-xs truncate'>
                    {ins.observaciones ? (
                      <span title={ins.observaciones}>{ins.observaciones}</span>
                    ) : (
                      <span className='text-slate-600 italic'>Sin notas</span>
                    )}
                  </td>
                  <td className='px-4 py-3 text-right'>
                    <div className='flex items-center justify-end gap-2'>
                      <button
                        onClick={() => abrirModalEditar(ins)}
                        className='text-slate-400 hover:text-amber-400 p-1 transition'
                        title='Editar gallo'
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteInscripcion(ins.id)}
                        className='text-slate-500 hover:text-red-400 p-1 transition'
                        title='Eliminar de la mesa de pesaje'
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Arbitraje */}
      {peleaEnArbitraje && (
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

            <div className='my-4'>
              <label className='block text-xs text-slate-400 mb-1'>
                Observaciones del Combate
              </label>
              <input
                type='text'
                value={observacionesPelea}
                onChange={(e) => setObservacionesPelea(e.target.value)}
                className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100'
                placeholder='Incidencias...'
              />
            </div>

            <div>
              <label className='block text-xs font-bold uppercase text-slate-400 mb-2'>
                Dictamen Oficial del Juez
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
                  🏆 Ganador Azul
                  <span className='block font-normal text-[11px] text-blue-200 mt-0.5'>
                    {peleaEnArbitraje.gallo_azul.nombre_equipo}
                  </span>
                </button>
                <button
                  type='button'
                  onClick={() =>
                    handleFinalizarCombate(
                      'blanco_gano',
                      peleaEnArbitraje.gallo_blanco.id,
                    )
                  }
                  className='bg-red-950/60 border border-red-600 hover:bg-red-600 text-white font-bold p-3 rounded-xl text-xs transition text-center'
                >
                  🏆 Ganador Rojo
                  <span className='block font-normal text-[11px] text-red-200 mt-0.5'>
                    {peleaEnArbitraje.gallo_blanco.nombre_equipo}
                  </span>
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

      {/* Modal Casamiento Manual */}
      {galloSeleccionadoManual && (
        <div className='fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6'>
            <h2 className='text-base font-bold text-slate-100 mb-2'>
              Casamiento Manual Forzado
            </h2>
            <p className='text-xs text-slate-400 mb-4'>
              Selecciona rival para{' '}
              <strong className='text-amber-400'>
                {galloSeleccionadoManual.nombre_equipo}
              </strong>{' '}
              (Aro {galloSeleccionadoManual.numero_anillo} -{' '}
              {galloSeleccionadoManual.peso_libras} Lb{' '}
              {Number(galloSeleccionadoManual.peso_onzas || 0).toFixed(2)} Oz -{' '}
              {galloSeleccionadoManual.marca_amv ||
                `M${galloSeleccionadoManual.marca}`}
              ).
            </p>

            <div className='space-y-2 max-h-60 overflow-y-auto pr-1'>
              {gallosPendientes
                .filter((g) => g.id !== galloSeleccionadoManual.id)
                .map((rival) => {
                  const diffPeso = Math.abs(
                    Number(galloSeleccionadoManual.peso_total_onzas) -
                      Number(rival.peso_total_onzas),
                  )
                  const marcaA =
                    parseInt(
                      String(
                        galloSeleccionadoManual.marca_amv ||
                          galloSeleccionadoManual.marca,
                      ).replace(/\D/g, ''),
                    ) || 0
                  const marcaB =
                    parseInt(
                      String(rival.marca_amv || rival.marca).replace(/\D/g, ''),
                    ) || 0
                  const diffMarca = Math.abs(marcaA - marcaB)
                  const esMismoEquipo =
                    galloSeleccionadoManual.nombre_equipo.toLowerCase() ===
                    rival.nombre_equipo.toLowerCase()

                  const espuelaIncompatible =
                    (galloSeleccionadoManual.tipo_espuela || 'Libre') !==
                    (rival.tipo_espuela || 'Libre')
                  const esAlerta =
                    diffPeso > 1 ||
                    diffMarca > 1 ||
                    esMismoEquipo ||
                    espuelaIncompatible

                  return (
                    <div
                      key={rival.id}
                      onClick={() => setRivalSeleccionadoManual(rival)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        rivalSeleccionadoManual?.id === rival.id
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <p className='font-bold text-slate-200'>
                          {rival.nombre_equipo} (Aro {rival.numero_anillo})
                        </p>
                        <p className='text-slate-400'>
                          {rival.peso_libras} Lb{' '}
                          {Number(rival.peso_onzas || 0).toFixed(2)} Oz •{' '}
                          {rival.marca_amv || `M${rival.marca}`} •{' '}
                          {rival.tipo_espuela}
                        </p>
                      </div>
                      <div className='text-right'>
                        {esAlerta ? (
                          <span className='text-[10px] text-amber-400 flex items-center gap-1 font-bold'>
                            <AlertTriangle size={12} /> Δ{' '}
                            {Number(diffPeso || 0).toFixed(2)} Oz{' '}
                            {espuelaIncompatible && '• Espuela ≠'}
                          </span>
                        ) : (
                          <span className='text-[10px] text-emerald-400 flex items-center gap-1 font-bold'>
                            <CheckCircle size={12} /> Compatible
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>

            <div className='flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4'>
              <button
                type='button'
                onClick={() => {
                  setGalloSeleccionadoManual(null)
                  setRivalSeleccionadoManual(null)
                }}
                className='px-4 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 transition'
              >
                Cancelar
              </button>
              <button
                type='button'
                disabled={!rivalSeleccionadoManual}
                onClick={handleGuardarCruceManual}
                className='bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition disabled:opacity-40'
              >
                Confirmar Casamiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pesaje / Edición */}
      {showModal && (
        <div className='fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto'>
            <h2 className='text-lg font-bold text-slate-100 mb-4'>
              {editandoId
                ? 'Editar Gallo en Báscula'
                : 'Registro en Báscula Oficial'}
            </h2>
            <form onSubmit={handleSubmitPesaje} className='space-y-4'>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    N° de Aro *
                  </label>
                  <input
                    type='text'
                    required
                    value={form.numero_anillo}
                    onChange={(e) =>
                      setForm({ ...form, numero_anillo: e.target.value })
                    }
                    className='w-full uppercase bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                    placeholder='EJ. 1042'
                  />
                </div>
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
                    className='w-full uppercase bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                    placeholder='EJ. TRABA LA FURIA'
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
                    className='w-full uppercase bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                    placeholder='EJ. GIRO / COLORADO / MARAÑÓN'
                  />
                </div>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Tipo de Espuela
                  </label>
                  <select
                    value={form.tipo_espuela}
                    onChange={(e) =>
                      setForm({ ...form, tipo_espuela: e.target.value })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  >
                    <option value='Libre'>Libre</option>
                    <option value='Pollo marcado'>Pollo marcado</option>
                  </select>
                </div>
              </div>

              {/* Selector de Báscula */}
              <div className='bg-slate-950 p-3 rounded-xl border border-slate-800'>
                <label className='block text-xs font-bold uppercase text-amber-400 mb-2'>
                  Peso en Báscula *
                </label>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='block text-[10px] text-slate-500 mb-1'>
                      Libras (Lb)
                    </label>
                    <input
                      type='number'
                      step='0.01'
                      min='0'
                      max='15'
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
                      Onzas (Oz)
                    </label>
                    <input
                      type='number'
                      step='0.01'
                      min='0'
                      max='15.99'
                      required
                      value={form.peso_onzas}
                      onChange={(e) =>
                        setForm({ ...form, peso_onzas: e.target.value })
                      }
                      className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold'
                    />
                  </div>
                </div>
              </div>

              {/* Bloque AMV */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Marca AMV *
                  </label>
                  <select
                    value={form.marca_amv}
                    onChange={(e) =>
                      setForm({ ...form, marca_amv: e.target.value })
                    }
                    className='w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold text-amber-400'
                  >
                    {opcionesMarcasAMV.map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-xs text-slate-400 mb-1'>
                    Placa AMV
                  </label>
                  <input
                    type='text'
                    value={form.placa_amv}
                    onChange={(e) =>
                      setForm({ ...form, placa_amv: e.target.value })
                    }
                    className='w-full uppercase bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono'
                    placeholder='EJ. AMV-9840'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs text-slate-400 mb-1'>
                  Comodines (Máximo 2 equipos)
                </label>
                <input
                  type='text'
                  value={form.comodines}
                  onChange={(e) =>
                    setForm({ ...form, comodines: e.target.value })
                  }
                  className='w-full uppercase bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  placeholder='EJ. CRIADERO SAN JOSÉ, TRABA EL ROBLE'
                />
              </div>

              <div>
                <label className='block text-xs text-slate-400 mb-1'>
                  Observaciones
                </label>
                <input
                  type='text'
                  value={form.observaciones}
                  onChange={(e) =>
                    setForm({ ...form, observaciones: e.target.value })
                  }
                  className='w-full uppercase bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100'
                  placeholder='DETALLES ADICIONALES...'
                />
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
                  className='bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition'
                >
                  {editandoId ? 'Actualizar Información' : 'Guardar en Báscula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
