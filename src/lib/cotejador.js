/**
 * Algoritmo de Cotejo Galleria AI
 * Reglas estrictas:
 * 1. No pelear contra el mismo equipo.
 * 2. Respetar comodines cruzados (A bloquea B o B bloquea A).
 * Reglas de tolerancia automática:
 * - Peso: Delta de <= 1 onza (0 o 1 onza de diferencia)
 * - Marca: Delta de <= 1 marca (Marca 1 vs Marca 1 o Marca 2)
 */
export function generarCotejoAutomatico(inscripcionesDisponibles) {
  const lista = [...inscripcionesDisponibles]
  const peleasGeneradas = []
  const casadosIds = new Set()

  // Ordenar de forma aleatoria/estratificada para evitar sesgos
  const shuffle = lista.sort(() => Math.random() - 0.5)

  for (let i = 0; i < shuffle.length; i++) {
    const galloA = shuffle[i]
    if (casadosIds.has(galloA.id)) continue

    let mejorRival = null
    let menorDiferenciaPeso = 999

    for (let j = 0; j < shuffle.length; j++) {
      const galloB = shuffle[j]
      if (galloA.id === galloB.id || casadosIds.has(galloB.id)) continue

      // 1. Mismo equipo descartado
      if (
        galloA.nombre_equipo.toLowerCase() ===
        galloB.nombre_equipo.toLowerCase()
      ) {
        continue
      }

      // 2. Filtro de Comodines
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

      // 3. Tolerancias: Peso <= 1 onza y Marca <= 1
      const diffPeso = Math.abs(
        galloA.peso_total_onzas - galloB.peso_total_onzas,
      )
      const diffMarca = Math.abs(galloA.marca - galloB.marca)

      if (diffPeso <= 1 && diffMarca <= 1) {
        if (diffPeso < menorDiferenciaPeso) {
          menorDiferenciaPeso = diffPeso
          mejorRival = galloB
          if (diffPeso === 0) break // Match ideal
        }
      }
    }

    if (mejorRival) {
      casadosIds.add(galloA.id)
      casadosIds.add(mejorRival.id)
      peleasGeneradas.push({
        gallo_azul: galloA,
        gallo_blanco: mejorRival,
        tipo_casamiento: 'automatico',
      })
    }
  }

  const noCasados = lista.filter((g) => !casadosIds.has(g.id))

  return { peleasGeneradas, noCasados }
}
