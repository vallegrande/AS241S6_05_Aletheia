<script>
  /**
   * DeveloperSection — "Quien firma": crédito de póster, no un CV.
   *
   * Estructura propia:
   *   - Nombre como crédito gigante de afiche (uppercase, tracking ceñido).
   *   - Foto tipo polaroid inclinada que se endereza al hover.
   *   - La historia en PRIMERA persona (quiénes somos y por qué lo hicimos).
   *   - Firma con coordenadas reales — humano, no etiquetas de formulario.
   */
  import { reveal } from '../actions/reveal'
</script>

<section id="desarrollador" class="dev" use:reveal>
  <div class="wrap">
    <p class="tag">// quien firma</p>

    <div class="credit">
      <div class="credit-copy">
        <h2 class="name">Carlos<br />Alejandro<br />Caycho Casas</h2>

        <blockquote class="why">
          Vivo en Cañete, al sur de Lima. Estudio Análisis de Sistemas en
          Valle Grande y construyo Aletheia por una rabia simple: el talento
          de aquí vale lo mismo que el de cualquier lado —
          <span class="why-punch">lo que falta es la prueba.</span>
        </blockquote>
      </div>

      <figure class="photo-card">
        <img
          src="/perfil.png"
          alt="Carlos Alejandro Caycho Casas"
          width="320"
          height="400"
          loading="lazy"
        />
        <figcaption class="photo-cap">aletheia · builder</figcaption>
      </figure>
    </div>

    <p class="sig">
      <span>13.15° S / 76.38° W — Cañete · Lima · Perú</span>
      <span>Svelte · Web3 · Full-Stack</span>
    </p>
  </div>
</section>

<style>
  .dev {
    padding-block: var(--s-9) var(--s-8);
  }

  .wrap {
    width: min(1160px, 100% - var(--s-5) * 2);
    margin-inline: auto;
  }

  .tag {
    margin: 0 0 var(--s-5);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.28em;
    color: var(--gray-400);
  }

  .tag::before {
    content: '';
    color: var(--purple-300);
  }

  /* ---- crédito: nombre gigante + polaroid ---- */
  .credit {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: var(--s-7);
    align-items: end;
  }

  .name {
    font-family: var(--font-display);
    font-size: clamp(2.8rem, 7.5vw, 6rem);
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 0.96;
    margin: 0;
    color: var(--white);
    text-transform: uppercase;
  }

  .why {
    margin: var(--s-5) 0 0;
    max-width: 44ch;
    font-family: var(--font-body);
    font-size: clamp(1.1rem, 1.7vw, 1.35rem);
    font-weight: 400;
    line-height: 1.6;
    letter-spacing: -0.01em;
    color: var(--gray-200);
  }

  .why-punch {
    color: var(--purple-300);
  }

  /* ---- polaroid: inclinada, se endereza al hover ---- */
  .photo-card {
    margin: 0;
    padding: 10px 10px 12px;
    border: 1px solid rgba(167, 139, 250, 0.22);
    border-radius: 6px;
    background: rgba(14, 8, 30, 0.55);
    backdrop-filter: blur(10px);
    transform: rotate(-3deg);
    transition: transform 0.35s ease, box-shadow 0.35s ease;
    box-shadow: 0 18px 50px rgba(5, 2, 12, 0.45);
  }

  .photo-card:hover {
    transform: rotate(0deg) translateY(-4px);
    box-shadow: 0 24px 60px rgba(5, 2, 12, 0.55);
  }

  .photo-card img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 4 / 5;
    object-fit: cover;
    border-radius: 3px;
    filter: saturate(0.9) contrast(1.05);
  }

  .photo-cap {
    padding-top: 10px;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    text-align: center;
    color: var(--gray-500);
  }

  /* ---- firma: coordenadas, no etiquetas ---- */
  .sig {
    margin: var(--s-7) 0 0;
    padding-top: var(--s-3);
    border-top: 1px solid rgba(167, 139, 250, 0.14);
    display: flex;
    justify-content: space-between;
    gap: var(--s-3);
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    color: var(--gray-500);
  }

  /* ---- responsive ---- */
  @media (max-width: 860px) {
    .credit {
      grid-template-columns: 1fr;
      gap: var(--s-5);
    }

    .photo-card {
      width: min(260px, 70%);
      transform: rotate(2.5deg);
      justify-self: end;
    }

    .photo-card:hover {
      transform: rotate(0deg) translateY(-4px);
    }

    .why {
      margin-top: var(--s-4);
    }
  }
</style>
