/**
 * chapters.ts — las seis escenas de la landing, en orden de recorrido.
 *
 * Fuente única para el índice lateral (SceneIndex) y para cualquier
 * indicador de capítulo: mismo numerado que la navegación superior.
 */
export type Chapter = { num: string; id: string; label: string }

export const CHAPTERS: Chapter[] = [
  { num: '00', id: 'inicio', label: 'Inicio' },
  { num: '01', id: 'descripcion', label: 'Descripción' },
  { num: '02', id: 'objetivos', label: 'Objetivos' },
  { num: '03', id: 'beneficios', label: 'Beneficios' },
  { num: '04', id: 'caracteristicas', label: 'Características' },
  { num: '05', id: 'desarrollador', label: 'Desarrollador' },
]
