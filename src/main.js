import { mount } from 'svelte'
// Geist Sans + Geist Mono (autoalojadas, sin Google Fonts)
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import './styles/base.css'
import App from './App.svelte'

const target = document.getElementById('app')

if (!target) {
  throw new Error('No se encontró el contenedor #app para montar Aletheia.')
}

const app = mount(App, { target })

export default app
