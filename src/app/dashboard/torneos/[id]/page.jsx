'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  FileText,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

export default function TorneoDetallePage({ params }) {
  const { id: torneoId } = use(params)
  const supabase = createClient()

  const router = useRouter() // Importar de 'next/navigation'
  const [navegando, setNavegando] = useState(false)
  const [mensajeNavegacion, setMensajeNavegacion] = useState('')

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

  const [guardandoPesaje, setGuardandoPesaje] = useState(false)

  // Modal Casamiento Manual
  const [galloSeleccionadoManual, setGalloSeleccionadoManual] = useState(null)
  const [rivalSeleccionadoManual, setRivalSeleccionadoManual] = useState(null)

  // Control de Combate en Vivo (Arbitraje)
  const [peleaEnArbitraje, setPeleaEnArbitraje] = useState(null)
  const [segundosCombate, setSegundosCombate] = useState(0)
  const [cronometroActivo, setCronometroActivo] = useState(false)
  const [observacionesPelea, setObservacionesPelea] = useState('')
  const timerRef = useRef(null)

  // Estados para el Modal de Modificación Rápida de Fallo
  const [modalModificarAbierto, setModalModificarAbierto] = useState(false)
  const [peleaAEditar, setPeleaAEditar] = useState(null)
  const [nuevoResultado, setNuevoResultado] = useState('')
  const [nuevoGanadorId, setNuevoGanadorId] = useState(null)
  const [editandoFalloLoading, setEditandoFalloLoading] = useState(false)

  // Estados de carga para la generación de PDFs
  const [descargandoCarteleraPDF, setDescargandoCarteleraPDF] = useState(false)
  const [descargandoResultadosPDF, setDescargandoResultadosPDF] =
    useState(false)

  // Abrir el modal cargando la pelea seleccionada
  const handleAbrirModalModificarFallo = (pelea) => {
    setPeleaAEditar(pelea)
    setNuevoResultado(pelea.resultado || '')
    setNuevoGanadorId(pelea.ganador_id || null)
    setModalModificarAbierto(true)
  }

  // Guardar la corrección del fallo en Supabase
  const handleGuardarModificacionFallo = async () => {
    if (!peleaAEditar) return
    setEditandoFalloLoading(true)

    const payload = {
      resultado: nuevoResultado,
      ganador_id: nuevoGanadorId,
      estado_transmision:
        nuevoResultado === 'pendiente' ? 'en_espera' : 'finalizado',
    }

    const { error } = await supabase
      .from('peleas')
      .update(payload)
      .eq('id', peleaAEditar.id)

    if (error) {
      alert('Error al actualizar el fallo: ' + error.message)
    } else {
      setModalModificarAbierto(false)
      setPeleaAEditar(null)
      await cargarDatos()
    }
    setEditandoFalloLoading(false)
  }

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
      .select('*, gallo_azul:gallo_azul_id(*), gallo_rojo:gallo_rojo_id(*)')
      .eq('torneo_id', torneoId)
      .order('numero_pelea', { ascending: true })

    if (tData) setTorneo(tData)
    if (iData) setInscripciones(iData)
    if (pData) setPeleas(pData)
    setLoading(false)
  }

  const formatearTiempoPelea = (pelea) => {
    const ms =
      Number(pelea.duracion_milisegundos) ||
      (pelea.duracion_segundos ? pelea.duracion_segundos * 1000 : 0)
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

  // Exportar Listado Oficial de Cotejos a PDF con Logo e Identidad Gráfica
  const handleExportarPDF = async () => {
    if (peleas.length === 0) {
      alert('No hay peleas armadas para exportar.')
      return
    }

    setDescargandoCarteleraPDF(true)
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter',
      })

      // Cargar e incrustar el logo en el encabezado del PDF
      try {
        const response = await fetch('/logo-mi-querencia.png')
        const blob = await response.blob()
        const base64Logo = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })
        // Colocar el logo en la esquina superior derecha (ancho: 36mm, alto: 24mm)
        doc.addImage(base64Logo, 'PNG', 225, 6, 36, 24)
      } catch (err) {
        console.warn('No se pudo cargar el logo en el PDF:', err)
      }

      // Encabezado Institucional
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('CENTRO AGROTURÍSTICO MI QUERENCIA', 14, 14)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `PROGRAMACIÓN OFICIAL DE COMBATES - ${torneo?.nombre?.toUpperCase() || 'TORNEO'}`,
        14,
        20,
      )

      doc.setFontSize(9)
      doc.setTextColor(100)
      doc.text(
        `Fecha del Evento: ${torneo?.fecha || 'N/A'}  |  Total de Peleas: ${peleas.length}  |  Falcón - Venezuela`,
        14,
        25,
      )

      // Armar filas de la tabla con agrupación por combate
      const filasTabla = []

      peleas.forEach((pelea) => {
        const gAzul = pelea.gallo_azul
        const gRojo = pelea.gallo_rojo

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
        startY: 31,
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
            if (
              data.column.index === 0 &&
              data.cell.raw &&
              typeof data.cell.raw === 'object'
            ) {
              return
            }
            if (data.row.index % 2 === 0) {
              data.cell.styles.fillColor = [240, 246, 255]
            } else {
              data.cell.styles.fillColor = [254, 242, 242]
            }
          }
        },
      })

      const nombreArchivo = `Cotejos_${torneo?.nombre?.replace(/\s+/g, '_') || 'Torneo'}.pdf`
      doc.save(nombreArchivo)
    } catch (err) {
      console.error(err)
      alert('Error al generar el PDF de cotejos.')
    } finally {
      setDescargandoCarteleraPDF(false)
    }
  }

  // Generador de Reporte PDF Oficial de Resultados Finales y Balance Estadístico
  const handleExportarResultadosPDF = async () => {
    if (peleas.length === 0) {
      alert('No hay combates registrados para exportar.')
      return
    }

    setDescargandoResultadosPDF(true)
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter',
      })

      // 1. Cargar Logo Oficial
      let base64Logo = null
      try {
        const response = await fetch('/logo-mi-querencia.png')
        const blob = await response.blob()
        base64Logo = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })
      } catch (err) {
        console.warn('No se pudo cargar el logo:', err)
      }

      // 2. Cálculos Estadísticos Oficiales
      const totalPeleasCasadas = peleas.length
      let totalMarcadasAMV = 0
      let totalLibres = 0
      let totalDescasadas = 0
      let totalNoAptas = 0
      let totalNulas = 0
      let totalTablas = 0
      let totalDecididas = 0

      peleas.forEach((p) => {
        const esMarcada =
          p.gallo_azul?.tipo_espuela?.toLowerCase().includes('marcado') ||
          p.gallo_rojo?.tipo_espuela?.toLowerCase().includes('marcado')
        if (esMarcada) {
          totalMarcadasAMV++
        } else {
          totalLibres++
        }

        if (p.resultado === 'descasada') totalDescasadas++
        else if (p.resultado === 'no_apta') totalNoAptas++
        else if (p.resultado === 'nula') totalNulas++
        else if (p.resultado === 'tabla') totalTablas++
        else if (
          p.resultado === 'azul_gano' ||
          p.resultado === 'blanco_gano' ||
          p.resultado === 'rojo_gano'
        ) {
          totalDecididas++
        }
      })

      const totalEfectuadas = totalTablas + totalDecididas
      const porcTablas =
        totalEfectuadas > 0
          ? ((totalTablas / totalEfectuadas) * 100).toFixed(2)
          : '0.00'
      const porcDecididas =
        totalEfectuadas > 0
          ? ((totalDecididas / totalEfectuadas) * 100).toFixed(2)
          : '0.00'

      // Formateador de tiempo a hh:mm:ss,cs
      const formatearTiempoCompleto = (ms) => {
        if (!ms || ms === 0) return '00:00:00,00'
        const totalSeg = Math.floor(ms / 1000)
        const horas = Math.floor(totalSeg / 3600)
          .toString()
          .padStart(2, '0')
        const minutos = Math.floor((totalSeg % 3600) / 60)
          .toString()
          .padStart(2, '0')
        const segundos = (totalSeg % 60).toString().padStart(2, '0')
        const centesimas = Math.floor((ms % 1000) / 10)
          .toString()
          .padStart(2, '0')
        return `${horas}:${minutos}:${segundos},${centesimas}`
      }

      // 3. Estructuración de Filas para la Tabla de Combates
      const filasResultados = []

      peleas.forEach((p) => {
        const gAzul = p.gallo_azul
        const gRojo = p.gallo_rojo
        const tiempoStr = formatearTiempoCompleto(
          p.duracion_milisegundos ||
            (p.duracion_segundos ? p.duracion_segundos * 1000 : 0),
        )

        let ganadorTexto = 'PENDIENTE'
        if (p.resultado === 'azul_gano')
          ganadorTexto = `ARO ${gAzul?.numero_anillo || 'AZUL'}`
        else if (p.resultado === 'rojo_gano')
          ganadorTexto = `ARO ${gRojo?.numero_anillo || 'ROJO'}`
        else if (p.resultado === 'tabla') ganadorTexto = 'TABLA'
        else if (p.resultado === 'descasada') ganadorTexto = 'DESCASADA'
        else if (p.resultado === 'no_apta') ganadorTexto = 'NO APTA'

        // Fila 1: Gallo Azul
        filasResultados.push([
          {
            content: `${p.numero_pelea}`,
            rowSpan: 2,
            styles: {
              halign: 'center',
              valign: 'middle',
              fontStyle: 'bold',
              fillColor: [245, 247, 250],
            },
          },
          gAzul?.numero_anillo || '-',
          `${gAzul?.nombre_equipo || '-'} (AZUL)`,
          gAzul?.color_pluma || '-',
          gAzul?.peso_libras ?? '-',
          Number(gAzul?.peso_onzas || 0).toFixed(2),
          gAzul?.tipo_espuela || 'Libre',
          gAzul?.marca_amv || `M${gAzul?.marca || 0}`,
          gAzul?.placa_amv || 'S/P',
          {
            content: ganadorTexto,
            rowSpan: 2,
            styles: {
              halign: 'center',
              valign: 'middle',
              fontStyle: 'bold',
              textColor: [153, 27, 27],
            },
          },
          {
            content: tiempoStr,
            rowSpan: 2,
            styles: {
              halign: 'center',
              valign: 'middle',
              fontStyle: 'bold',
              font: 'courier',
            },
          },
        ])

        // Fila 2: Gallo Rojo
        filasResultados.push([
          gRojo?.numero_anillo || '-',
          `${gRojo?.nombre_equipo || '-'} (ROJO)`,
          gRojo?.color_pluma || '-',
          gRojo?.peso_libras ?? '-',
          Number(gRojo?.peso_onzas || 0).toFixed(2),
          gRojo?.tipo_espuela || 'Libre',
          gRojo?.marca_amv || `M${gRojo?.marca || 0}`,
          gRojo?.placa_amv || 'S/P',
        ])
      })

      // 4. Dibujar Páginas de Resultados
      autoTable(doc, {
        startY: 28,
        head: [
          [
            'N°',
            'Aro',
            'Equipo / Cuerda',
            'Color',
            'Lbs',
            'Oz',
            'Espuela',
            'Marca',
            'Placa AMV',
            'Ganador',
            'Tiempo Final',
          ],
        ],
        body: filasResultados,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          valign: 'middle',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
          2: { fontStyle: 'bold', cellWidth: 46 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 10 },
          5: { halign: 'center', cellWidth: 12 },
          6: { halign: 'center', cellWidth: 24 },
          7: { halign: 'center', cellWidth: 16 },
          8: { halign: 'center', cellWidth: 20 },
          9: { halign: 'center', cellWidth: 28 },
          10: { halign: 'center', cellWidth: 32 },
        },
        didDrawPage: (data) => {
          // Membrete en cada página
          if (base64Logo) {
            doc.addImage(base64Logo, 'PNG', 232, 5, 30, 20)
          }
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(15, 23, 42)
          doc.text('CENTRO AGROTURÍSTICO MI QUERENCIA', 14, 12)

          doc.setFontSize(9.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(153, 119, 56)
          doc.text(
            `RESULTADOS OFICIALES DE COMBATES - ${torneo?.nombre?.toUpperCase() || 'TORNEO'}`,
            14,
            17,
          )

          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100)
          doc.text(
            `Fecha del Evento: ${torneo?.fecha || 'N/A'}  |  Falcón - Venezuela  |  Pág. ${doc.internal.getNumberOfPages()}`,
            14,
            22,
          )
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (
              (data.column.index === 0 || data.column.index >= 9) &&
              data.cell.raw &&
              typeof data.cell.raw === 'object'
            ) {
              return
            }
            if (data.row.index % 2 === 0) {
              data.cell.styles.fillColor = [240, 246, 255]
            } else {
              data.cell.styles.fillColor = [254, 242, 242]
            }
          }
        },
      })

      // 5. Agregar Hoja Final de Resumen Estadístico
      doc.addPage('letter', 'portrait') // Hoja vertical formal para el cierre

      if (base64Logo) {
        doc.addImage(base64Logo, 'PNG', 145, 10, 48, 32)
      }

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('CENTRO AGROTURÍSTICO MI QUERENCIA', 14, 20)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(153, 119, 56)
      doc.text(`BALANCE Y RESUMEN ESTADÍSTICO FINAL`, 14, 27)

      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      doc.text(
        `Torneo: ${torneo?.nombre?.toUpperCase()}  |  Fecha: ${torneo?.fecha}`,
        14,
        33,
      )

      // Cuadro de Resumen Estadístico Oficial
      autoTable(doc, {
        startY: 42,
        head: [['INDICADOR DEL EVENTO', 'CANTIDAD / VALOR']],
        body: [
          ['REGLAMENTO APLICADO', 'REGLAMENTO VENEZOLANO PURO'],
          ['TOTAL PELEAS CASADAS', `${totalPeleasCasadas}`],
          ['PELEAS MARCADAS AMV', `${totalMarcadasAMV}`],
          ['PELEAS LIBRES', `${totalLibres}`],
          ['PELEAS DESCASADAS', `${totalDescasadas}`],
          ['PELEAS NO APTAS', `${totalNoAptas}`],
          ['PELEAS NULAS', `${totalNulas}`],
          ['PELEAS EFECTUADAS (TOTAL ENTRADAS A RUEDO)', `${totalEfectuadas}`],
          ['PELEAS TABLAS (EMPATES)', `${totalTablas}  (${porcTablas} %)`],
          [
            'PELEAS DECIDIDAS (CON GANADOR)',
            `${totalDecididas}  (${porcDecididas} %)`,
          ],
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [153, 119, 56],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9.5,
          halign: 'left',
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3.5,
          valign: 'middle',
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 120, textColor: [30, 41, 59] },
          1: {
            halign: 'center',
            fontStyle: 'bold',
            font: 'courier',
            textColor: [153, 27, 27],
          },
        },
      })

      // Firmas de Conformidad
      const posFinalY = doc.lastAutoTable.finalY + 35
      doc.setDrawColor(180)
      doc.line(20, posFinalY, 80, posFinalY)
      doc.line(125, posFinalY, 185, posFinalY)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(60)
      doc.text('MESA TÉCNICA Y PESAJE', 50, posFinalY + 5, { align: 'center' })
      doc.text('JUEZ DE VALLA PRINCIPAL', 155, posFinalY + 5, {
        align: 'center',
      })

      const nombreArchivo = `Resultados_Finales_${torneo?.nombre?.replace(/\s+/g, '_') || 'Torneo'}.pdf`
      doc.save(nombreArchivo)
    } catch (err) {
      console.error(err)
      alert('Error al generar el PDF de resultados.')
    } finally {
      setDescargandoResultadosPDF(false)
    }
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
    setGuardandoPesaje(true) // <--- Activar loading

    try {
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
          await cargarDatos()
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
          await cargarDatos()
        } else {
          alert('Error al registrar: ' + error.message)
        }
      }
    } catch (err) {
      console.error(err)
      alert('Error inesperado al guardar en báscula.')
    } finally {
      setGuardandoPesaje(false) // <--- Desactivar loading
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
      gallosEnPeleas.add(p.gallo_rojo_id)
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
      gallo_rojo_id: p.gallo_rojo.id,
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
      gallo_rojo_id: rivalSeleccionadoManual.id,
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
    idsCasados.add(p.gallo_rojo_id)
  })
  const gallosPendientes = inscripciones.filter((i) => !idsCasados.has(i.id))

  const peleasFinalizadas = peleas.filter((p) => p.resultado !== 'pendiente')
  const totalAzulGano = peleas.filter((p) => p.resultado === 'azul_gano').length
  const totalRojoGano = peleas.filter((p) => p.resultado === 'rojo_gano').length
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
      {/* Overlay de carga al navegar */}
      {navegando && (
        <div className='fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3'>
          <Loader2 className='w-10 h-10 text-amber-500 animate-spin' />
          <span className='text-xs font-bold text-slate-300 uppercase tracking-widest'>
            {mensajeNavegacion || 'Procesando...'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col gap-4 border-b border-slate-800 pb-4'>
        <div>
          <button
            onClick={() => {
              setMensajeNavegacion('Regresando al listado de torneos...')
              setNavegando(true)
              router.push('/dashboard/torneos')
            }}
            className='cursor-pointer inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold mb-2 transition'
          >
            <ArrowLeft size={14} /> Volver a Torneos
          </button>
          <h1 className='text-xl sm:text-2xl font-black text-slate-100 leading-tight'>
            {torneo?.nombre || 'Torneo'}
          </h1>
          <p className='text-xs text-slate-400 mt-1'>
            Fecha: {torneo?.fecha} • {inscripciones.length} Gallos en Báscula •{' '}
            {peleas.length} Peleas Programadas
          </p>
        </div>

        {/* Botonera con cursor-pointer y feedback de loading */}
        <div className='grid grid-cols-2 sm:flex sm:flex-wrap gap-2'>
          <button
            onClick={abrirModalCrear}
            className='cursor-pointer flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-2.5 rounded-xl text-xs transition border border-slate-700 active:scale-95'
          >
            <Plus size={14} /> Báscula
          </button>

          {/* Botón Descarga Cartelera */}
          <button
            onClick={handleExportarPDF}
            disabled={descargandoCarteleraPDF}
            className='cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-2.5 rounded-xl text-xs transition border border-slate-700 active:scale-95'
            title='Descargar cartelera oficial en PDF'
          >
            {descargandoCarteleraPDF ? (
              <>
                <Loader2 size={14} className='text-amber-400 animate-spin' />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <FileDown size={14} className='text-amber-400' />
                <span>Cartelera PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handleEjecutarCotejoAuto}
            className='cursor-pointer flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-500/10 active:scale-95'
          >
            <Sparkles size={14} /> Cotejar
          </button>

          <button
            onClick={() => {
              setMensajeNavegacion('Abriendo Mesa de Arbitraje en Vivo...')
              setNavegando(true)
              router.push(`/dashboard/torneos/${torneoId}/arbitraje`)
            }}
            className='cursor-pointer flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-500/10 active:scale-95'
          >
            <Swords size={14} /> Arbitraje Vivo
          </button>

          {/* Botón Descarga Resultados */}
          <button
            onClick={handleExportarResultadosPDF}
            disabled={descargandoResultadosPDF}
            className='cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 col-span-2 sm:col-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-600/10 active:scale-95'
            title='Descargar Reporte Completo de Resultados y Resumen Estadístico'
          >
            {descargandoResultadosPDF ? (
              <>
                <Loader2 size={14} className='text-white animate-spin' />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <FileText size={14} />
                <span>Descargar Resultados (PDF)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className='flex gap-2 sm:gap-4 border-b border-slate-800 text-xs sm:text-sm overflow-x-auto pb-1 scrollbar-none'>
        <button
          onClick={() => setActiveTab('cotejo')}
          className={`cursor-pointer pb-2.5 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap px-1 ${
            activeTab === 'cotejo'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Swords size={15} /> Cartelera ({peleas.length})
        </button>
        <button
          onClick={() => setActiveTab('pesaje')}
          className={`cursor-pointer pb-2.5 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap px-1 ${
            activeTab === 'pesaje'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale size={15} /> Pesaje ({inscripciones.length})
        </button>
        <button
          onClick={() => setActiveTab('estadisticas')}
          className={`cursor-pointer pb-2.5 font-semibold transition border-b-2 flex items-center gap-1.5 whitespace-nowrap px-1 ${
            activeTab === 'estadisticas'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 size={15} /> Estadísticas
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
                {`Presiona "Ejecutar Cotejo" para casar automáticamente o usa el
                casamiento manual.`}
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {peleas.map((pelea) => {
                const gAzul = pelea.gallo_azul
                const gRojo = pelea.gallo_rojo
                const diffPeso = Math.abs(
                  (gAzul?.peso_onzas || 0) - (gRojo?.peso_onzas || 0),
                ).toFixed(2)
                const tieneResultado =
                  pelea.resultado && pelea.resultado !== 'pendiente'

                return (
                  <div
                    key={pelea.id}
                    className='bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative shadow-lg'
                  >
                    {/* Encabezado de la Tarjeta */}
                    <div className='flex items-center justify-between mb-3'>
                      <span className='bg-amber-500 text-slate-950 text-xs font-black px-3 py-1 rounded-lg uppercase tracking-wider'>
                        PELEA #{pelea.numero_pelea}
                      </span>
                      <button
                        onClick={() => handleEliminarPelea(pelea.id)}
                        className='text-slate-600 hover:text-red-400 p-1 rounded-lg transition'
                        title='Eliminar Pelea'
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Confrontación: Azul vs Rojo Adaptativo */}
                    <div className='flex flex-col sm:grid sm:grid-cols-11 gap-2.5 items-center my-2.5'>
                      {/* Esquina Azul */}
                      <div
                        className={`w-full sm:col-span-5 p-3 rounded-xl border transition ${
                          pelea.resultado === 'azul_gano'
                            ? 'bg-blue-950/70 border-blue-500 ring-1 ring-blue-400'
                            : 'bg-slate-950/40 border-slate-800'
                        }`}
                      >
                        <span className='text-[10px] font-bold text-blue-400 uppercase block'>
                          Esquina Azul
                        </span>
                        <p className='font-bold text-slate-100 text-sm truncate'>
                          {gAzul?.nombre_equipo || '---'}
                        </p>
                        <p className='text-[11px] text-slate-400'>
                          Aro: {gAzul?.numero_anillo} • {gAzul?.color_pluma}
                        </p>
                        <p className='text-xs font-black text-amber-400 mt-0.5'>
                          {gAzul?.peso_libras} Lb{' '}
                          {Number(gAzul?.peso_onzas || 0).toFixed(2)} Oz
                        </p>
                        <p className='text-[10px] text-slate-500 truncate'>
                          {gAzul?.placa_amv && gAzul?.placa_amv !== 'S/P'
                            ? `(${gAzul?.marca_amv || `M${gAzul?.marca}`} N•AMV-${gAzul?.placa_amv.replace(/^AMV-?/i, '')})`
                            : gAzul?.marca_amv || `M${gAzul?.marca || 0}`}{' '}
                          • {gAzul?.tipo_espuela || 'Libre'}
                        </p>
                        {pelea.resultado === 'azul_gano' && (
                          <span className='inline-block text-[10px] font-black text-emerald-400 mt-2 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20'>
                            🏆 GANADOR
                          </span>
                        )}
                      </div>

                      <div className='w-full sm:col-span-1 text-center font-black italic text-slate-500 text-xs py-0.5 sm:py-0'>
                        VS
                      </div>

                      {/* Esquina Roja */}
                      <div
                        className={`w-full sm:col-span-5 p-3 rounded-xl border transition ${
                          pelea.resultado === 'rojo_gano'
                            ? 'bg-red-950/70 border-red-500 ring-1 ring-red-400'
                            : 'bg-slate-950/40 border-slate-800'
                        }`}
                      >
                        <span className='text-[10px] font-bold text-red-400 uppercase block'>
                          Esquina Roja
                        </span>
                        <p className='font-bold text-slate-100 text-sm truncate'>
                          {gRojo?.nombre_equipo || '---'}
                        </p>
                        <p className='text-[11px] text-slate-400'>
                          Aro: {gRojo?.numero_anillo} • {gRojo?.color_pluma}
                        </p>
                        <p className='text-xs font-black text-amber-400 mt-0.5'>
                          {gRojo?.peso_libras} Lb{' '}
                          {Number(gRojo?.peso_onzas || 0).toFixed(2)} Oz
                        </p>
                        <p className='text-[10px] text-slate-500 truncate'>
                          {gRojo?.placa_amv && gRojo?.placa_amv !== 'S/P'
                            ? `(${gRojo?.marca_amv || `M${gRojo?.marca}`} N•AMV-${gRojo?.placa_amv.replace(/^AMV-?/i, '')})`
                            : gRojo?.marca_amv || `M${gRojo?.marca || 0}`}{' '}
                          • {gRojo?.tipo_espuela || 'Libre'}
                        </p>
                        {pelea.resultado === 'rojo_gano' && (
                          <span className='inline-block text-[10px] font-black text-emerald-400 mt-2 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20'>
                            🏆 GANADOR
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pie de la Tarjeta */}
                    <div className='border-t border-slate-800 pt-2.5 mt-2 flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <span className='text-[11px] text-slate-500 font-mono'>
                          Δ {diffPeso} oz
                        </span>
                        {(pelea.duracion_milisegundos > 0 ||
                          pelea.duracion_segundos > 0) && (
                          <span className='text-xs font-mono font-black text-amber-400 flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 tracking-wider'>
                            <span>⏱</span> {formatearTiempoPelea(pelea)}
                          </span>
                        )}
                        {pelea.resultado === 'tabla' && (
                          <span className='text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded'>
                            TABLA
                          </span>
                        )}
                        {pelea.resultado === 'descasada' && (
                          <span className='text-[10px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded'>
                            DESCASADA
                          </span>
                        )}
                      </div>

                      {/* Único botón de acción rápida cuando la pelea ya finalizó */}
                      {tieneResultado ? (
                        <button
                          onClick={() => handleAbrirModalModificarFallo(pelea)}
                          className='text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5'
                        >
                          <Swords size={13} className='text-amber-400' />{' '}
                          Modificar Fallo
                        </button>
                      ) : (
                        <span className='text-[11px] font-semibold text-slate-500 italic'>
                          Pendiente en Ruedo
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

      {/* Modal para Modificar Fallo Rápido */}
      {modalModificarAbierto && peleaAEditar && (
        <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200'>
            <div className='flex items-center justify-between border-b border-slate-800 pb-3'>
              <div>
                <h3 className='text-base font-black text-amber-500 uppercase tracking-wider'>
                  Modificar Fallo - Pelea #{peleaAEditar.numero_pelea}
                </h3>
                <p className='text-xs text-slate-400'>
                  {peleaAEditar.gallo_rojo?.nombre_equipo} vs{' '}
                  {peleaAEditar.gallo_azul?.nombre_equipo}
                </p>
              </div>
              <button
                onClick={() => setModalModificarAbierto(false)}
                className='text-slate-500 hover:text-slate-300 text-sm font-bold p-1'
              >
                ✕
              </button>
            </div>

            {/* Opciones de Ganador */}
            <div className='space-y-2'>
              <span className='text-[11px] font-bold text-slate-400 uppercase tracking-wider block'>
                Seleccionar Vencedor Oficial:
              </span>

              <div className='grid grid-cols-2 gap-2.5'>
                {/* Opción Cuerda Roja */}
                <button
                  type='button'
                  onClick={() => {
                    setNuevoResultado('rojo_gano')
                    setNuevoGanadorId(peleaAEditar.gallo_rojo?.id)
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition ${
                    nuevoResultado === 'blanco_gano' ||
                    nuevoResultado === 'rojo_gano'
                      ? 'bg-red-950/80 border-red-500 ring-2 ring-red-400'
                      : 'bg-slate-950/50 border-slate-800 hover:bg-red-950/30'
                  }`}
                >
                  <span className='text-[10px] font-black text-red-400 uppercase block'>
                    CUERDA ROJA
                  </span>
                  <p className='text-xs font-bold text-white truncate mt-0.5'>
                    {peleaAEditar.gallo_rojo?.nombre_equipo}
                  </p>
                  <span className='text-[10px] text-slate-400'>
                    Aro: {peleaAEditar.gallo_rojo?.numero_anillo}
                  </span>
                </button>

                {/* Opción Cuerda Azul */}
                <button
                  type='button'
                  onClick={() => {
                    setNuevoResultado('azul_gano')
                    setNuevoGanadorId(peleaAEditar.gallo_azul?.id)
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition ${
                    nuevoResultado === 'azul_gano'
                      ? 'bg-blue-950/80 border-blue-500 ring-2 ring-blue-400'
                      : 'bg-slate-950/50 border-slate-800 hover:bg-blue-950/30'
                  }`}
                >
                  <span className='text-[10px] font-black text-blue-400 uppercase block'>
                    CUERDA AZUL
                  </span>
                  <p className='text-xs font-bold text-white truncate mt-0.5'>
                    {peleaAEditar.gallo_azul?.nombre_equipo}
                  </p>
                  <span className='text-[10px] text-slate-400'>
                    Aro: {peleaAEditar.gallo_azul?.numero_anillo}
                  </span>
                </button>
              </div>

              {/* Opciones Especiales */}
              <div className='grid grid-cols-3 gap-2 pt-2'>
                <button
                  type='button'
                  onClick={() => {
                    setNuevoResultado('tabla')
                    setNuevoGanadorId(null)
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    nuevoResultado === 'tabla'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Tabla
                </button>

                <button
                  type='button'
                  onClick={() => {
                    setNuevoResultado('descasada')
                    setNuevoGanadorId(null)
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    nuevoResultado === 'descasada'
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Descasada
                </button>

                <button
                  type='button'
                  onClick={() => {
                    setNuevoResultado('pendiente')
                    setNuevoGanadorId(null)
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    nuevoResultado === 'pendiente'
                      ? 'bg-slate-700 border-slate-500 text-slate-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Pendiente
                </button>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className='flex justify-end gap-3 pt-4 border-t border-slate-800'>
              <button
                type='button'
                disabled={guardandoPesaje}
                onClick={() => {
                  setShowModal(false)
                  setEditandoId(null)
                }}
                className='cursor-pointer disabled:opacity-40 px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 transition'
              >
                Cancelar
              </button>
              <button
                type='submit'
                disabled={guardandoPesaje}
                className='cursor-pointer disabled:cursor-not-allowed disabled:opacity-75 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition active:scale-95'
              >
                {guardandoPesaje ? (
                  <>
                    <Loader2 size={16} className='animate-spin' />
                    <span>Guardando en báscula...</span>
                  </>
                ) : (
                  <span>
                    {editandoId
                      ? 'Actualizar Información'
                      : 'Guardar en Báscula'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
