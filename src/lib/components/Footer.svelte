<script>
  /**
   * Footer — según la spec: brand + tagline, columnas
   * PRODUCTO / RECURSOS / LEGAL y copyright.
   */
  import { auth } from '../stores/auth'

  const year = new Date().getFullYear()

  const columnas = [
    {
      titulo: 'Producto',
      links: [
        { label: 'Cómo funciona', href: '#como-funciona' },
        { label: 'Para profesionales', href: '#profesionales' },
        { label: 'Para empresas', href: '#empresas' },
        { label: 'Verificación', href: '#verificacion' },
      ],
    },
    {
      titulo: 'Recursos',
      links: [
        { label: 'FAQ', href: '#faq' },
        { label: 'Integraciones', href: '#integraciones' },
        { label: 'Panel', href: '#/panel' },
      ],
    },
    {
      titulo: 'Legal',
      links: [
        { label: 'Privacidad', href: '#verificacion' },
        { label: 'Términos', href: '#verificacion' },
      ],
    },
  ]
</script>

<footer class="footer">
  <div class="wrap footer-grid">
    <div class="brand-block">
      <img class="brand-logo" src="/aletheia-logo.png" alt="" width="38" height="43" />
      <div>
        <p class="brand-name">ALETHEIA</p>
        <p class="muted small">
          Identidad Digital Descentralizada<br />para la Economía del Talento
        </p>
      </div>
    </div>

    {#each columnas as col (col.titulo)}
      <nav aria-label={col.titulo}>
        <p class="col-title">{col.titulo}</p>
        {#each col.links as l (l.label)}
          <a href={l.href}>{l.label}</a>
        {/each}
      </nav>
    {/each}
  </div>

  <div class="wrap legal">
    <p class="small muted">© {year} Aletheia · Carlos Alejandro Caycho Casas</p>
    <p class="small muted">13.15° S / 76.38° W — Cañete · Lima · Perú</p>
  </div>
</footer>

<style>
  .footer {
    border-top: 1px solid rgba(167, 139, 250, 0.1);
    background: transparent; /* el fondo único en movimiento queda visible */
    padding-block: var(--s-6) var(--s-4);
    margin-top: auto;
  }

  .wrap {
    width: min(1160px, 100% - var(--s-5) * 2);
    margin-inline: auto;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 1.4fr repeat(3, 1fr);
    gap: var(--s-6);
    align-items: start;
  }

  .brand-block {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .brand-logo {
    width: 38px;
    height: auto;
    filter: none;
  }

  .brand-name {
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: 0.14em;
    color: var(--white);
    margin: 0 0 6px;
  }

  .brand-block .muted {
    margin: 0;
    line-height: 1.5;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .col-title {
    margin: 0 0 4px;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.24em;
    color: var(--gray-500);
  }

  nav a {
    font-size: 0.9rem;
    color: var(--gray-400);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  nav a:hover {
    color: var(--purple-300);
  }

  .legal {
    margin-top: var(--s-6);
    padding-top: var(--s-3);
    border-top: 1px solid rgba(167, 139, 250, 0.1);
    display: flex;
    justify-content: space-between;
    gap: var(--s-3);
    flex-wrap: wrap;
  }

  .legal p {
    margin: 0;
  }

  @media (max-width: 820px) {
    .footer-grid {
      grid-template-columns: 1fr 1fr;
    }

    .brand-block {
      grid-column: 1 / -1;
    }

    .legal {
      flex-direction: column;
      gap: 4px;
    }
  }
</style>
