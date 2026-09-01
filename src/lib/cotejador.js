/**
 * Algoritmo de Cotejo Galleria / Mi Querencia AI
 * Reglas estrictas:
 * 1. No pelear contra el mismo equipo.
 * 2. Respetar comodines cruzados.
 * 3. Misma espuela obligatoria: Solo 'Libre' vs 'Libre' y 'Pollo marcado' vs 'Pollo marcado'.
 * Reglas de tolerancia automática:
 * - Peso: Delta de <= 1 onza (0 a 1 oz)
 * - Marca AMV: Delta de <= 1 marca
 */
export function generarCotejoAutomatico(inscripcionesDisponibles) {
  const lista = [...inscripcionesDisponibles]
  const peleasGeneradas = []
  const casadosIds = new Set()

  const shuffle = lista.sort(() => Math.random() - 0.5)

  for (let i = 0; i < shuffle.length; i++) {
    const galloA = shuffle[i]
    if (casadosIds.has(galloA.id)) continue

    let mejorRival = null
    let menorDiferenciaPeso = 999

    for (let j = 0; j < shuffle.length; j++) {
      const galloB = shuffle[j]
      if (galloA.id === galloB.id || casadosIds.has(galloB.id)) continue

      // 1. Descartar mismo equipo
      if (
        galloA.nombre_equipo.toLowerCase() ===
        galloB.nombre_equipo.toLowerCase()
      ) {
        continue
      }

      // 2. Regla de Espuela: Misma categoría obligatoria
      const espuelaA = (galloA.tipo_espuela || 'Libre').trim().toLowerCase()
      const espuelaB = (galloB.tipo_espuela || 'Libre').trim().toLowerCase()
      if (espuelaA !== espuelaB) {
        continue
      }

      // 3. Filtro de Comodines
      const comodinesA = (galloA.comodines || []).map((c) => c.toLowerCase())
      const comodinesB = (galloB.comodines || []).map((c) => c.toLowerCase())

      const bloqueoA = comodinesA.some((c) =>
        galloB.nombre_equipo.toLowerCase().includes(c),
      )
      const bloqueoB = comodinesB.some((c) =>
        galloA.nombre_equipo.toLowerCase().includes(c),
      )

      if (bloqueoA || bloqueoB) {
        continue
      }

      // 4. Tolerancias de Peso y Marca AMV
      const diffPeso = Math.abs(
        Number(galloA.peso_total_onzas) - Number(galloB.peso_total_onzas),
      )
      const marcaA =
        parseInt(String(galloA.marca_amv || galloA.marca).replace(/\D/g, '')) ||
        0
      const marcaB =
        parseInt(String(galloB.marca_amv || galloB.marca).replace(/\D/g, '')) ||
        0
      const diffMarca = Math.abs(marcaA - marcaB)

      if (diffPeso <= 1 && diffMarca <= 1) {
        if (diffPeso < menorDiferenciaPeso) {
          menorDiferenciaPeso = diffPeso
          mejorRival = galloB
          if (diffPeso === 0) break
        }
      }
    }

    if (mejorRival) {
      casadosIds.add(galloA.id)
      casadosIds.add(mejorRival.id)
      peleasGeneradas.push({
        gallo_azul: galloA,
        gallo_rojo: mejorRival, // Actúa como esquina roja
        tipo_casamiento: 'automatico',
      })
    }
  }

  const noCasados = lista.filter((g) => !casadosIds.has(g.id))

  return { peleasGeneradas, noCasados }
}
