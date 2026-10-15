<script>
  /**
   * GooSVG — reproduce el núcleo visual de `liquid-gooey` (libraries.dev):
   * un filtro SVG de blur + contraste que fusiona nodos como "goo" líquido.
   * Los elementos hijos que se acercan entre sí se "derriten" unos en otros
   * manteniendo el texto nítido (el texto vive FUERA del filtro).
   *
   * Adapta fielmente el comportamiento del paquete React original a Svelte,
   * sin dependencias React. Ver docs/INTEGRATIONS.md.
   *
   * Props:
   *   blur     — suavidad del goo (default 6, igual que Liquid blur={6})
   *   contrast — nitidez del borde (default 18, igual que Liquid contrast={18})
   *   fill     — color de relleno de la silueta fundida (default '#ffffff')
   *   id       — id único del filtro
   */
  let { blur = 6, contrast = 18, fill = '#ffffff', id = 'goo-filter' } = $props()
</script>

<svg aria-hidden="true" class="goo-svg" width="0" height="0">
  <defs>
    <filter {id} color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="blur" />
      <feColorMatrix
        in="blur"
        type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 {contrast} -9"
        result="goo"
      />
      <feBlend in="SourceGraphic" in2="goo" />
    </filter>
  </defs>
</svg>

<style>
  .goo-svg {
    position: absolute;
    width: 0;
    height: 0;
    pointer-events: none;
  }
</style>
