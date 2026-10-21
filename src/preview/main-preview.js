/**
 * main-preview.js — entrada del preview del dashboard (solo dev).
 * Uso: npx vite --config vite.dash-preview.config.js → /preview.html
 */
import { mount } from 'svelte'
import DashPreview from './DashPreview.svelte'

const app = mount(DashPreview, { target: document.getElementById('app') })
export default app
