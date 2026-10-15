/**
 * toast.ts — Notificaciones globales (toasts) de la app.
 *
 * Usado principalmente por auth.ts: cuando el usuario cancela el popup de
 * Google, cierra la ventana o falla la red, la UI muestra una advertencia
 * bonita y temporal en vez de texto rojo estático.
 *
 * Tonos:
 *   warning → cancelaciones del usuario (popup cerrado) — tono suave ámbar
 *   error   → fallos reales (red, dominio, config) — tono rojo
 *   success → confirmaciones (sesión iniciada)
 */

export type ToastTone = 'warning' | 'error' | 'success' | 'info'

export type Toast = {
  id: number
  tone: ToastTone
  title: string
  detail?: string
  /** ms hasta auto-cerrar (0 = no cierra solo). */
  ttl: number
}

import { writable } from 'svelte/store'

export const toasts = writable<Toast[]>([])

let seq = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()

/** Añade un toast; devuelve su id. ttl por defecto según tono. */
export function pushToast(tone: ToastTone, title: string, detail?: string, ttl?: number): number {
  const id = ++seq
  const life = ttl ?? (tone === 'error' ? 7000 : 5200)
  toasts.update((list) => [...list.slice(-2), { id, tone, title, detail, ttl: life }]) // máx 3 apilados
  if (life > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), life),
    )
  }
  return id
}

/** Cierra un toast concreto (por X o auto). */
export function dismissToast(id: number) {
  const t = timers.get(id)
  if (t) {
    clearTimeout(t)
    timers.delete(id)
  }
  toasts.update((list) => list.filter((x) => x.id !== id))
}
