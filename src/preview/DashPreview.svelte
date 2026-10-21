<script>
  /**
   * DashPreview.svelte — contenedor del preview del dashboard (solo dev).
   * Monta DashboardSection con el client mockeado, sobre el fondo real del panel.
   */
  import '@fontsource/geist-sans/400.css'
  import '@fontsource/geist-sans/500.css'
  import '@fontsource/geist-sans/600.css'
  import '@fontsource/geist-sans/700.css'
  import '@fontsource/geist-mono/400.css'
  import '@fontsource/geist-mono/500.css'
  import '../styles/base.css'
  import '../styles/dapp.css'
  import DashboardSection from '../lib/components/panel/DashboardSection.svelte'
</script>

<main class="db-preview-shell">
  <DashboardSection />
</main>

<style>
  main {
    min-height: 100vh;
    padding: 24px 28px;
    box-sizing: border-box;
  }
</style>
