<script>
  /**
   * TrustSection — "Verificación + Privacidad" según la spec.
   *
   * Dos mitades:
   *   1. Verificación: mock de credencial válida (lo que ve un tercero,
   *      sin cuenta) con checks de blockchain/integridad/identidad.
   *   2. Privacidad: panel de niveles (PÚBLICO/COMPARTIDO/PRIVADO)
   *      + principios del sistema.
   */
  import Icon from './Icon.svelte'
  import ProfileCard from './ProfileCard.svelte'
  import { reveal } from '../actions/reveal'

  const niveles = [
    { item: 'Nombre', level: 'PÚBLICO', open: true },
    { item: 'Habilidades', level: 'PÚBLICO', open: true },
    { item: 'Certificación', level: 'COMPARTIDO', shared: true },
    { item: 'Documento personal', level: 'PRIVADO', locked: true },
    { item: 'Información sensible', level: 'PRIVADO', locked: true },
  ]

  const principios = [
    'Control del usuario.',
    'Compartición selectiva.',
    'Información privada fuera de blockchain.',
    'Evidencia verificable.',
    'Identidad portable.',
  ]
</script>

<section id="verificacion" class="trust" use:reveal>
  <div class="wrap">
    <h2 class="display-2">Verificar debería tomar segundos,<br />no días. Y tú decides qué mostrar.</h2>

    <div class="duo">
      <!-- ====== verificación (mock credencial) ====== -->
      <div class="half">
        <p class="half-kicker">verificación abierta</p>
        <p class="half-text muted">
          Una persona recibe el perfil de un profesional y comprueba la
          información <strong>sin necesidad de tener cuenta en Aletheia</strong>.
        </p>

        <div class="cred" role="img" aria-label="Ejemplo de credencial verificada">
          <p class="cred-status"><Icon name="shield" size={14} /> Credencial válida</p>
          <dl class="cred-data">
            <div><dt>Proyecto</dt><dd>Sistema EduNova</dd></div>
            <div><dt>Habilidad</dt><dd>Spring Boot</dd></div>
            <div><dt>Certificado</dt><dd class="mono">12/08/2026</dd></div>
          </dl>
          <ul class="cred-checks">
            <li><Icon name="check" size={13} /> Blockchain</li>
            <li><Icon name="check" size={13} /> Integridad</li>
            <li><Icon name="check" size={13} /> Identidad</li>
          </ul>
          <button class="cred-btn" type="button">Ver registro blockchain</button>
        </div>
      </div>

      <!-- ====== privacidad (niveles) ====== -->
      <div class="half">
        <p class="half-kicker">privacidad por diseño</p>
        <p class="half-text muted">
          Aletheia no necesita publicar toda tu información para demostrar una
          credencial. Comparte únicamente lo necesario.
        </p>

        <ul class="levels" aria-label="Niveles de visibilidad">
          {#each niveles as n (n.item)}
            <li>
              <span class="lv-item">
                {#if n.locked}<Icon name="lock" size={14} />{:else}<Icon name="eye" size={14} />{/if}
                {n.item}
              </span>
              <span
                class="lv-level"
                class:lv-public={n.open}
                class:lv-shared={n.shared}
                class:lv-private={n.locked}>{n.level}</span
              >
            </li>
          {/each}
        </ul>

        <ul class="principles">
          {#each principios as p (p)}
            <li>{p}</li>
          {/each}
        </ul>
      </div>
    </div>
  </div>
</section>

<style>
  .trust {
    padding-block: var(--s-9);
    scroll-margin-top: 76px;
    border-top: 1px solid rgba(167, 139, 250, 0.08);
  }

  .wrap {
    width: min(1160px, 100% - var(--s-5) * 2);
    margin-inline: auto;
  }

  .display-2 {
    font-family: var(--font-display);
    font-size: clamp(1.9rem, 4vw, 2.9rem);
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 1.1;
    margin: 0 0 var(--s-6);
    color: var(--white);
  }

  .duo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--s-6);
    align-items: start;
  }

  .half {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
  }

  .half-kicker {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.26em;
    color: var(--purple-300);
  }

  .half-text {
    margin: 0;
    max-width: 48ch;
  }

  .half-text strong {
    color: var(--gray-100);
  }

  /* ====== credencial ====== */
  .cred {
    display: flex;
    flex-direction: column;
    gap: var(--s-3);
    padding: var(--s-4);
    border: 1px solid rgba(110, 231, 183, 0.3);
    border-radius: 18px;
    background: rgba(8, 24, 18, 0.5);
    backdrop-filter: blur(14px);
  }

  .cred-status {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: #6ee7b7;
  }

  .cred-data {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cred-data div {
    display: flex;
    justify-content: space-between;
    gap: var(--s-3);
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(110, 231, 183, 0.12);
  }

  .cred-data dt {
    font-size: 0.84rem;
    color: var(--gray-400);
  }

  .cred-data dd {
    margin: 0;
    font-size: 0.88rem;
    color: var(--gray-050);
    text-align: right;
  }

  .cred-checks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .cred-checks li {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: #6ee7b7;
    padding: 6px 12px;
    border: 1px solid rgba(110, 231, 183, 0.3);
    border-radius: 999px;
    background: rgba(110, 231, 183, 0.07);
  }

  .cred-btn {
    min-height: 40px;
    border-radius: 999px;
    border: 1px solid rgba(110, 231, 183, 0.4);
    background: rgba(110, 231, 183, 0.08);
    color: #a7f3d0;
    font-family: var(--font-display);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .cred-btn:hover {
    background: rgba(110, 231, 183, 0.16);
  }

  /* ====== niveles de privacidad ====== */
  .levels {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(167, 139, 250, 0.14);
    border-radius: 18px;
    background: rgba(10, 6, 22, 0.45);
    backdrop-filter: blur(14px);
    overflow: hidden;
  }

  .levels li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s-3);
    padding: 13px 18px;
    border-bottom: 1px solid rgba(167, 139, 250, 0.08);
  }

  .levels li:last-child {
    border-bottom: none;
  }

  .lv-item {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-size: 0.92rem;
    color: var(--gray-100);
  }

  .lv-item :global(svg) {
    color: var(--gray-500);
  }

  .lv-level {
    font-family: var(--font-mono);
    font-size: 0.64rem;
    letter-spacing: 0.16em;
  }

  .lv-public {
    color: #6ee7b7;
  }

  .lv-shared {
    color: var(--purple-300);
  }

  .lv-private {
    color: var(--gray-500);
  }

  .principles {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .principles li {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--gray-400);
    padding: 6px 13px;
    border: 1px solid rgba(167, 139, 250, 0.18);
    border-radius: 999px;
  }

  @media (max-width: 860px) {
    .duo {
      grid-template-columns: 1fr;
    }
  }
</style>
