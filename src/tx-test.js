/**
 * tx-test.js — HARNESS TEMPORAL de diagnóstico (borrar tras la revisión).
 * Monta el módulo de transacciones suelto, con wallet simulada conectada,
 * para poder fotografiar el modal y la tabla sin pasar por AuthGate/Firebase.
 */
import { mount } from 'svelte'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import './styles/base.css'
import TxTest from './TxTest.svelte'

const target = document.getElementById('app')
if (!target) throw new Error('sin #app')
mount(TxTest, { target })

// Rellena el formulario para fotografiar el botón desbloqueado (harness)
function setVal(el, v) {
  if (!el) return
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
if (!location.search.includes('empty=1')) {
  setVal(document.querySelector('#txm-to'), '0x2DBd3fE26E81d76B4a32fE58f490d49c7138d9c6')
  setVal(document.querySelector('#txm-amount'), '1')
}
if (location.search.includes('hover=1')) {
  setTimeout(() => document.querySelector('.goo-btn')?.dispatchEvent(new PointerEvent('pointerenter')), 300)
}
