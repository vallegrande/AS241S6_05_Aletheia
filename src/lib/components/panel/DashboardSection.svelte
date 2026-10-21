<script>
  /**
   * DashboardSection — telemetría de identidad profesional.
   *
   * Brief: terminal phosphor sobre el vidrio morado del panel. Números Geist
   * Mono tabulares, reglas hairline, un acento (mint = verificado). Momento
   * memorable: marcador de INTEGRIDAD (count-up + gauge segmentado) y la
   * cinta de auditoría (un tick por evidencia, en orden cronológico).
   */
  import { onMount } from 'svelte'
  import { listEvidences, listTransactions, getProfile } from '../../api/client'
  import { auth } from '../../stores/auth'
  import { getTxUrl, prettyNetwork } from '../../web3/chains'
  import { PROOF_REGISTRY_ADDRESS } from '../../web3/proof-registry'
  import { requestOpenProfileModal } from '../../stores/panelBus'
  import { fade, fly } from 'svelte/transition'
  import Icon from '../Icon.svelte'
  import StatusMessage from '../dapp/StatusMessage.svelte'

  const user = $derived($auth.user)
  const initial = $derived((user?.displayName ?? user?.email ?? 'A').trim().charAt(0).toUpperCase())

  let loading = $state(true)
  let error = $state('')
  let evidences = $state([])
  let txs = $state([])
  let profile = $state(null)

  /* ---------------- métricas base ---------------- */
  const total = $derived(evidences.length)
  const hashed = $derived(evidences.filter((e) => e.cert_status === 'hashed' || e.cert_status === 'onchain').length)
  const onchain = $derived(evidences.filter((e) => e.cert_status === 'onchain').length)
  const pending = $derived(total - hashed)
  /** Integridad: % de evidencias que llegaron a huella (hashed u on-chain). */
  const coverage = $derived(total === 0 ? 0 : Math.round((hashed / total) * 100))
  const hashRate = $derived(total === 0 ? 0 : Math.round((onchain / total) * 100))

  const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`
  const now = new Date()
  const thisMonth = monthKey(now)
  const evThisMonth = $derived(evidences.filter((e) => e.created_at && monthKey(new Date(e.created_at)) === thisMonth).length)
  const txThisMonth = $derived(txs.filter((t) => t.created_at && monthKey(new Date(t.created_at)) === thisMonth).length)

  /* último movimiento entre evidencias y transacciones */
  const lastActivity = $derived.by(() => {
    const stamps = [
      ...evidences.map((e) => e.created_at),
      ...txs.map((t) => t.created_at),
    ].filter(Boolean)
    if (!stamps.length) return null
    return new Date(Math.max(...stamps.map((s) => new Date(s).getTime())))
  })
  const lastActivityLabel = $derived.by(() => {
    if (!lastActivity) return '—'
    const days = Math.floor((Date.now() - lastActivity.getTime()) / 86400000)
    if (days <= 0) return 'hoy'
    if (days === 1) return 'ayer'
    if (days < 30) return `hace ${days} d`
    return lastActivity.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  })

  const tipoLabel = (id) =>
    ({ proyecto: 'Proyecto', certificacion: 'Certificación', logro: 'Logro', portafolio: 'Portafolio' })[id] ?? id

  /* ---------------- cinta de auditoría ----------------
     Un tick por evidencia en orden cronológico: mint = on-chain,
     morado = con huella, gris = pendiente. Es el ADN del dashboard. */
  const tape = $derived.by(() => {
    const sorted = [...evidences].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    return sorted.map((e) => ({
      id: e.id,
      title: e.titulo,
      state: e.cert_status === 'onchain' ? 'ok' : e.cert_status === 'hashed' ? 'hue' : 'dim',
    }))
  })

  /* ---------------- INTEGRIDAD: gauge segmentado + count-up ---------------- */
  const SEGS = 28
  let shownCoverage = $state(0)
  $effect(() => {
    const target = coverage
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shownCoverage = target
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 700)
      shownCoverage = Math.round(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  })
  const filledSegs = $derived(Math.round((shownCoverage / 100) * SEGS))

  /* ---------------- actividad: 12 meses, evidencias + tx ---------------- */
  const monthly = $derived.by(() => {
    const buckets = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({
        key: monthKey(d),
        label: d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''),
        n: 0,
        k: 0,
      })
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]))
    for (const e of evidences) {
      if (!e.created_at) continue
      const k = monthKey(new Date(e.created_at))
      if (k in idx) buckets[idx[k]].n++
    }
    for (const t of txs) {
      if (!t.created_at) continue
      const k = monthKey(new Date(t.created_at))
      if (k in idx) buckets[idx[k]].k++
    }
    return buckets
  })
  const monthMax = $derived(Math.max(1, ...monthly.map((b) => Math.max(b.n, b.k))))

  /* ---------------- distribución por tipo ---------------- */
  const TIPO_COLOR = {
    proyecto: '#a78bfa',
    certificacion: '#22d3ee',
    logro: '#6ee7b7',
    portafolio: '#fb7185',
  }
  const byTipo = $derived.by(() => {
    const m = {}
    for (const e of evidences) m[e.tipo] = (m[e.tipo] || 0) + 1
    return Object.entries(m)
      .map(([tipo, n]) => ({ tipo, n, pct: total ? Math.round((n / total) * 100) : 0, color: TIPO_COLOR[tipo] || '#8a8a96' }))
      .sort((a, b) => b.n - a.n)
  })

  /* ---------------- embudo de certificación ---------------- */
  const funnel = $derived.by(() => {
    const conv = (a, b) => (a === 0 ? 0 : Math.round((b / a) * 100))
    return [
      { label: 'Evidencias', n: total, pct: total ? 100 : 0, color: '#8a8a96' },
      { label: 'Con huella', n: hashed, pct: conv(total, hashed), color: '#a78bfa' },
      { label: 'On-chain', n: onchain, pct: conv(hashed, onchain), color: '#6ee7b7' },
    ]
  })

  /* ---------------- feed on-chain ---------------- */
  const recentTxs = $derived(txs.slice(0, 5))

  /* ---------------- completitud del perfil ---------------- */
  const profilePct = $derived.by(() => {
    const p = profile || {}
    const checks = [
      Boolean(p.nombre),
      Boolean(p.titulo),
      Boolean(p.bio),
      Boolean(p.links && Object.keys(p.links).length),
      p.foto === '/api/profile/photo',
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  })

  onMount(async () => {
    try {
      const [evs, prof, t] = await Promise.allSettled([listEvidences(), getProfile(), listTransactions()])
      if (evs.status === 'fulfilled') evidences = evs.value
      else throw evs.reason
      if (prof.status === 'fulfilled') profile = prof.value
      if (t.status === 'fulfilled') txs = t.value
    } catch (e) {
      error = e.message || 'No se pudo cargar el dashboard'
    } finally {
      loading = false
    }
  })

  const short = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '—')
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short' })
</script>

<section class="db" aria-label="Dashboard">
  {#if loading}
    <StatusMessage tone="muted" spin message="Cargando tu telemetría…" />
  {:else if error}
    <StatusMessage tone="error" message={error} />
  {:else}
    <div class="db-grid" in:fade={{ duration: 280 }}>
      <!-- ============ hero: identidad + INTEGRIDAD ============ -->
      <article class="db-card db-hero" in:fly={{ y: 8, duration: 300 }}>
        <div class="db-hero-id">
          {#if user?.photoURL}
            <img class="db-av" src={user.photoURL} alt="" referrerpolicy="no-referrer" />
          {:else}
            <span class="db-av db-av-fb" aria-hidden="true">{initial}</span>
          {/if}
          <div class="db-hero-text">
            <p class="db-eyebrow">Telemetría de identidad</p>
            <h2 class="db-name">{profile?.nombre || user?.displayName || 'Tu perfil'}</h2>
            {#if profile?.titulo}<p class="db-role">{profile.titulo}</p>{/if}
          </div>
          <button type="button" class="btn btn-sm db-hero-btn" onclick={() => requestOpenProfileModal()}>
            Editar perfil
          </button>
        </div>

        <div class="db-gauge" role="img" aria-label={`Integridad: ${coverage}% de evidencias con huella`}>
          <div class="db-gauge-num">
            <span class="db-gauge-pct">{shownCoverage}</span><span class="db-gauge-unit">%</span>
          </div>
          <p class="db-gauge-label">Integridad</p>
          <div class="db-gauge-segs" aria-hidden="true">
            {#each Array(SEGS) as _, i}
              <span class="db-seg" class:fill={i < filledSegs} style:--i={i}></span>
            {/each}
          </div>
          <p class="db-gauge-cap">
            {hashed}/{total} con huella · {onchain} on-chain
            {#if !PROOF_REGISTRY_ADDRESS}<span class="db-warn"> · contrato sin configurar</span>{/if}
          </p>
        </div>
      </article>

      <!-- ============ cinta de auditoría ============ -->
      <article class="db-card db-tape-card" in:fly={{ y: 8, duration: 300, delay: 40 }}>
        <div class="db-card-head">
          <p class="db-card-title">Cinta de auditoría</p>
          <p class="db-card-meta">{total} registro{total === 1 ? '' : 's'} en orden cronológico</p>
        </div>
        {#if total === 0}
          <p class="db-empty-inline">La cinta se llena con tus evidencias: morado al generar la huella, mint al certificar on-chain.</p>
        {:else}
          <div class="db-tape" role="img" aria-label="Estado de cada evidencia en orden cronológico">
            {#each tape as t (t.id)}
              <span class="db-tick {t.state}" title={t.title}></span>
            {/each}
          </div>
          <div class="db-tape-legend">
            <span><i class="db-dot ok"></i>on-chain</span>
            <span><i class="db-dot hue"></i>con huella</span>
            <span><i class="db-dot dim"></i>pendiente</span>
          </div>
        {/if}
      </article>

      <!-- ============ KPIs ============ -->
      <div class="db-kpis">
        <article class="db-card db-kpi" in:fly={{ y: 8, duration: 300, delay: 80 }}>
          <p class="db-kpi-label">Evidencias</p>
          <p class="db-kpi-num">{total}</p>
          <p class="db-kpi-sub">{evThisMonth ? `+${evThisMonth} este mes` : 'sin nuevas este mes'}</p>
        </article>
        <article class="db-card db-kpi" in:fly={{ y: 8, duration: 300, delay: 110 }}>
          <p class="db-kpi-label">Con huella</p>
          <p class="db-kpi-num">{hashed}</p>
          <p class="db-kpi-sub">{total ? `${coverage}% de ${total}` : '—'}</p>
        </article>
        <article class="db-card db-kpi" in:fly={{ y: 8, duration: 300, delay: 140 }}>
          <p class="db-kpi-label">On-chain</p>
          <p class="db-kpi-num ok">{onchain}</p>
          <p class="db-kpi-sub">{total ? `${hashRate}% del total` : '—'}</p>
        </article>
        <article class="db-card db-kpi" in:fly={{ y: 8, duration: 300, delay: 170 }}>
          <p class="db-kpi-label">Transacciones</p>
          <p class="db-kpi-num">{txs.length}</p>
          <p class="db-kpi-sub">{txThisMonth ? `+${txThisMonth} este mes` : 'sin tx este mes'}</p>
        </article>
        <article class="db-card db-kpi" in:fly={{ y: 8, duration: 300, delay: 200 }}>
          <p class="db-kpi-label">Pendientes</p>
          <p class="db-kpi-num dim">{pending}</p>
          <p class="db-kpi-sub">{pending ? 'esperando huella' : 'todo en orden'}</p>
        </article>
        <article class="db-card db-kpi" in:fly={{ y: 8, duration: 300, delay: 230 }}>
          <p class="db-kpi-label">Último registro</p>
          <p class="db-kpi-num db-kpi-date">{lastActivityLabel}</p>
          <p class="db-kpi-sub">perfil {profilePct}% completo</p>
        </article>
      </div>

      <!-- ============ actividad 12 meses ============ -->
      <article class="db-card db-chart db-wide" in:fly={{ y: 8, duration: 300, delay: 260 }}>
        <div class="db-card-head">
          <p class="db-card-title">Actividad · 12 meses</p>
          <p class="db-card-meta">{#if evThisMonth || txThisMonth}{evThisMonth} evidencia{evThisMonth === 1 ? '' : 's'} · {txThisMonth} tx este mes{:else}mes en curso sin movimiento{/if}</p>
        </div>
        {#if total === 0}
          <p class="db-empty-inline">Sin actividad aún. Crea evidencias para ver tu historial aquí.</p>
        {:else}
          <div class="db-plot" role="img" aria-label="Evidencias creadas y transacciones por mes, últimos 12 meses">
            <div class="db-plot-grid" aria-hidden="true">
              <span style="--y: 100%"></span><span style="--y: 75%"></span><span style="--y: 50%"></span><span style="--y: 25%"></span>
            </div>
            <div class="db-plot-cols">
              {#each monthly as m (m.key)}
                <div class="db-plot-col" title={`${m.label}: ${m.n} evidencia${m.n === 1 ? '' : 's'}, ${m.k} tx`}>
                  <div class="db-plot-track">
                    <span
                      class="db-plot-bar hue"
                      style:height={`${(m.n / monthMax) * 100}%`}
                      style:opacity={m.n ? 1 : 0}
                    ></span>
                    <span
                      class="db-plot-bar ok"
                      style:height={`${(m.k / monthMax) * 100}%`}
                      style:opacity={m.k ? 1 : 0}
                    ></span>
                  </div>
                  <span class="db-plot-lbl" class:hot={m.key === thisMonth}>{m.label}</span>
                </div>
              {/each}
            </div>
          </div>
          <div class="db-tape-legend">
            <span><i class="db-dot hue"></i>evidencias creadas</span>
            <span><i class="db-dot ok"></i>registros on-chain</span>
          </div>
        {/if}
      </article>

      <!-- ============ distribución por tipo ============ -->
      <article class="db-card db-chart" in:fly={{ y: 8, duration: 300, delay: 290 }}>
        <div class="db-card-head">
          <p class="db-card-title">Distribución</p>
          <p class="db-card-meta">por tipo de evidencia</p>
        </div>
        {#if total === 0}
          <p class="db-empty-inline">Sin datos todavía.</p>
        {:else}
          <ul class="db-tipo">
            {#each byTipo as t (t.tipo)}
              <li>
                <span class="db-tipo-name">{tipoLabel(t.tipo)}</span>
                <div class="db-tipo-bar" role="img" aria-label={`${tipoLabel(t.tipo)}: ${t.n} de ${total}`}>
                  <span style:width={`${t.pct}%`} style:background={t.color}></span>
                </div>
                <span class="db-tipo-n">{t.n}</span>
                <span class="db-tipo-pct">{t.pct}%</span>
              </li>
            {/each}
          </ul>
        {/if}
      </article>

      <!-- ============ embudo de certificación ============ -->
      <article class="db-card db-chart" in:fly={{ y: 8, duration: 300, delay: 320 }}>
        <div class="db-card-head">
          <p class="db-card-title">Embudo</p>
          <p class="db-card-meta">evidencia → huella → cadena</p>
        </div>
        {#if total === 0}
          <p class="db-empty-inline">El embudo muestra cuántas evidencias llegan a cada etapa.</p>
        {:else}
          <ol class="db-funnel">
            {#each funnel as f, i (f.label)}
              <li>
                <div class="db-funnel-row">
                  <span class="db-funnel-label">{f.label}</span>
                  <span class="db-funnel-n">{f.n}</span>
                  <span class="db-funnel-pct">{f.pct}%</span>
                </div>
                <div class="db-funnel-bar" style:width={`${Math.max(f.pct, 4)}%`} style:background={f.color} style:transition-delay={`${i * 120}ms`}></div>
                {#if i < funnel.length - 1 && funnel[i + 1].n > 0}
                  <p class="db-funnel-step">↓ {f.n - funnel[i + 1].n} se quedan en esta etapa</p>
                {/if}
              </li>
            {/each}
          </ol>
        {/if}
      </article>

      <!-- ============ feed on-chain ============ -->
      <article class="db-card db-chart db-feed" in:fly={{ y: 8, duration: 300, delay: 350 }}>
        <div class="db-card-head">
          <p class="db-card-title">Registro on-chain</p>
          <p class="db-card-meta">{txs.length} transacción{txs.length === 1 ? '' : 'es'} en total</p>
        </div>
        {#if recentTxs.length === 0}
          <p class="db-empty-inline">Sin registros on-chain todavía. Certifica una evidencia desde el módulo Certificados.</p>
        {:else}
          <ul class="db-feed-list">
            {#each recentTxs as t (t.id)}
              <li class="db-feed-row">
                <span class="db-feed-date">{fmtDate(t.created_at)}</span>
                <span class="db-feed-title" title={t.titulo}>{t.titulo}</span>
                <span class="db-feed-net">{prettyNetwork('', t.chain_id)}</span>
                {#if getTxUrl(t.chain_id, t.tx_hash)}
                  <a class="db-feed-link" href={getTxUrl(t.chain_id, t.tx_hash)} target="_blank" rel="noopener noreferrer">
                    {short(t.tx_hash)} ↗
                  </a>
                {:else}
                  <span class="db-feed-link">{short(t.tx_hash)}</span>
                {/if}
              </li>
            {/each}
          </ul>
          <button type="button" class="db-feed-more" onclick={() => document.getElementById('nav-historial')?.click()}>
            Ver historial completo →
          </button>
        {/if}
      </article>
    </div>
  {/if}
</section>

<style>
  /* =====================================================================
     Tokens del dashboard — telemetría sobre el vidrio morado del panel.
     Un acento (mint = verificado), un radio (10px), reglas hairline.
     Todo número: Geist Mono, tabular-nums.
     ===================================================================== */
  .db {
    --db-ok: #6ee7b7;
    --db-ok-bg: rgba(110, 231, 183, 0.1);
    --db-hue: #a78bfa;
    --db-hue-bg: rgba(167, 139, 250, 0.12);
    --db-dim: #55545e;
    --db-warn: #fbbf24;
    --db-ink: #f4f2fa;
    --db-ink-2: #9b97ab;
    --db-ink-3: #8d8a9e;
    --db-line: rgba(255, 255, 255, 0.07);
    --db-card: rgba(255, 255, 255, 0.024);
    --db-radius: 10px;
    --db-ease: cubic-bezier(0.22, 1, 0.36, 1);
    --db-mono: var(--font-mono, 'Geist Mono', ui-monospace, monospace);
  }

  /* ---- retícula: 12 columnas, bandas por ritmo vertical ---- */
  .db-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 12px;
    width: 100%;
  }

  .db-card {
    min-width: 0;
    padding: 14px 16px;
    border: 1px solid var(--db-line);
    border-radius: var(--db-radius);
    background: var(--db-card);
  }

  .db-card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .db-card-title {
    margin: 0;
    font-family: var(--db-mono);
    font-size: 0.66rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--db-ink-2);
  }

  .db-card-meta {
    margin: 0;
    font-size: 0.72rem;
    color: var(--db-ink-3);
  }

  .db-empty-inline {
    margin: 8px 0 4px;
    font-size: 0.78rem;
    line-height: 1.5;
    color: var(--db-ink-3);
  }

  /* ---- hero ---- */
  .db-hero {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 20px;
    padding: 16px 20px;
  }

  .db-hero-id {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .db-av {
    display: block;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.14);
    flex: none;
  }

  .db-av-fb {
    display: grid;
    place-items: center;
    font-family: var(--db-mono);
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--db-ink);
    background: #232328;
  }

  .db-hero-text {
    min-width: 0;
  }

  .db-eyebrow {
    margin: 0 0 2px;
    font-family: var(--db-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--db-ok);
  }

  .db-name {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    color: var(--db-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .db-role {
    margin: 2px 0 0;
    font-size: 0.78rem;
    color: var(--db-ink-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .db-hero-btn {
    flex: none;
    margin-left: auto;
  }

  /* ---- INTEGRIDAD: número gigante + gauge segmentado ---- */
  .db-gauge {
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto auto auto;
    justify-items: end;
    column-gap: 16px;
    text-align: right;
    flex: none;
  }

  .db-gauge-num {
    grid-row: 1 / 3;
    display: flex;
    align-items: baseline;
    gap: 2px;
    line-height: 0.9;
  }

  .db-gauge-pct {
    font-family: var(--db-mono);
    font-size: 3rem;
    font-weight: 700;
    letter-spacing: -0.04em;
    color: var(--db-ink);
    font-variant-numeric: tabular-nums;
  }

  .db-gauge-unit {
    font-family: var(--db-mono);
    font-size: 1.1rem;
    color: var(--db-ok);
  }

  .db-gauge-label {
    grid-row: 1 / 3;
    align-self: center;
    grid-column: 2;
    margin: 4px 0 0;
    font-family: var(--db-mono);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--db-ink-2);
  }

  .db-gauge-segs {
    grid-column: 1 / -1;
    display: flex;
    gap: 3px;
    margin-top: 10px;
  }

  .db-seg {
    width: 8px;
    height: 14px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.07);
    transition: background 0.3s var(--db-ease) calc(var(--i) * 14ms), box-shadow 0.3s var(--db-ease) calc(var(--i) * 14ms);
  }

  .db-seg.fill {
    background: var(--db-ok);
    box-shadow: 0 0 6px rgba(110, 231, 183, 0.35);
  }

  .db-gauge-cap {
    grid-column: 1 / -1;
    margin: 8px 0 0;
    font-family: var(--db-mono);
    font-size: 0.66rem;
    font-variant-numeric: tabular-nums;
    color: var(--db-ink-3);
  }

  .db-warn {
    color: var(--db-warn);
  }

  /* ---- cinta de auditoría ---- */
  .db-tape-card {
    grid-column: 1 / -1;
  }

  .db-tape {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .db-tick {
    width: 9px;
    height: 18px;
    border-radius: 2px;
    background: var(--db-dim);
  }

  .db-tick.ok {
    background: var(--db-ok);
    box-shadow: 0 0 6px rgba(110, 231, 183, 0.4);
  }

  .db-tick.hue {
    background: var(--db-hue);
  }

  .db-tape-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin-top: 10px;
    font-size: 0.7rem;
    color: var(--db-ink-3);
  }

  .db-tape-legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .db-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
  }

  .db-dot.ok { background: var(--db-ok); }
  .db-dot.hue { background: var(--db-hue); }
  .db-dot.dim { background: var(--db-dim); }

  /* ---- KPIs ---- */
  .db-kpis {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }

  .db-kpi {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 14px;
  }

  .db-kpi-label {
    margin: 0;
    font-family: var(--db-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--db-ink-3);
  }

  .db-kpi-num {
    margin: 0;
    font-family: var(--db-mono);
    font-size: 1.9rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.05;
    color: var(--db-ink);
    font-variant-numeric: tabular-nums;
  }

  .db-kpi-num.ok { color: var(--db-ok); }
  .db-kpi-num.dim { color: var(--db-ink-3); }

  .db-kpi-date {
    font-size: 1.05rem;
    letter-spacing: -0.01em;
    padding-top: 4px;
  }

  .db-kpi-sub {
    margin: 0;
    font-size: 0.7rem;
    color: var(--db-ink-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ---- gráficos de banda inferior ---- */
  .db-chart {
    grid-column: span 4;
    display: flex;
    flex-direction: column;
  }

  .db-wide {
    grid-column: span 8;
  }

  .db-feed {
    grid-column: span 8;
  }

  /* ---- actividad: columnas con retícula ---- */
  .db-plot {
    flex: 1;
    min-height: 168px;
    position: relative;
    display: flex;
  }

  .db-plot-grid {
    position: absolute;
    inset: 0 0 22px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    pointer-events: none;
  }

  .db-plot-grid span {
    position: absolute;
    left: 0;
    right: 0;
    top: var(--y);
    height: 1px;
    background: var(--db-line);
  }

  .db-plot-cols {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }

  .db-plot-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    height: 100%;
  }

  .db-plot-track {
    position: relative;
    flex: 1;
    min-height: 0;
    width: 100%;
    max-width: 42px;
  }

  .db-plot-bar {
    position: absolute;
    bottom: 0;
    left: 25%;
    right: 25%;
    border-radius: 3px 3px 0 0;
    transition: height 0.7s var(--db-ease);
  }

  .db-plot-bar.hue {
    background: var(--db-hue-bg);
    border: 1px solid rgba(167, 139, 250, 0.55);
    border-bottom: none;
  }

  .db-plot-bar.ok {
    background: var(--db-ok-bg);
    border: 1px solid rgba(110, 231, 183, 0.7);
    border-bottom: none;
    z-index: 1;
  }

  .db-plot-lbl {
    flex: none;
    font-family: var(--db-mono);
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--db-ink-3);
  }

  .db-plot-lbl.hot {
    color: var(--db-ok);
  }

  /* ---- distribución por tipo ---- */
  .db-tipo {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
  }

  .db-tipo li {
    display: grid;
    grid-template-columns: minmax(0, 5.4em) minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 10px;
  }

  .db-tipo-name {
    font-size: 0.76rem;
    color: var(--db-ink-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .db-tipo-bar {
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }

  .db-tipo-bar span {
    display: block;
    height: 100%;
    border-radius: 999px;
    transition: width 0.7s var(--db-ease);
  }

  .db-tipo-n {
    font-family: var(--db-mono);
    font-size: 0.8rem;
    color: var(--db-ink);
    font-variant-numeric: tabular-nums;
  }

  .db-tipo-pct {
    width: 3.2em;
    text-align: right;
    font-family: var(--db-mono);
    font-size: 0.68rem;
    color: var(--db-ink-3);
    font-variant-numeric: tabular-nums;
  }

  /* ---- embudo ---- */
  .db-funnel {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
  }

  .db-funnel-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .db-funnel-label {
    flex: 1;
    min-width: 0;
    font-size: 0.76rem;
    color: var(--db-ink-2);
  }

  .db-funnel-n {
    font-family: var(--db-mono);
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--db-ink);
    font-variant-numeric: tabular-nums;
  }

  .db-funnel-pct {
    width: 4em;
    text-align: right;
    font-family: var(--db-mono);
    font-size: 0.7rem;
    color: var(--db-ink-3);
    font-variant-numeric: tabular-nums;
  }

  .db-funnel-bar {
    height: 8px;
    margin: 4px 0 8px;
    border-radius: 3px;
    transition: width 0.7s var(--db-ease);
  }

  .db-funnel-step {
    margin: 0 0 10px;
    font-family: var(--db-mono);
    font-size: 0.64rem;
    color: var(--db-ink-3);
  }

  /* ---- feed on-chain ---- */
  .db-feed-list {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .db-feed-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 12px;
    padding: 9px 0;
    border-bottom: 1px solid var(--db-line);
    font-size: 0.76rem;
  }

  .db-feed-row:last-child {
    border-bottom: none;
  }

  .db-feed-date {
    font-family: var(--db-mono);
    font-size: 0.66rem;
    color: var(--db-ink-3);
    font-variant-numeric: tabular-nums;
  }

  .db-feed-title {
    min-width: 0;
    color: var(--db-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .db-feed-net {
    font-family: var(--db-mono);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--db-hue);
  }

  .db-feed-link {
    font-family: var(--db-mono);
    font-size: 0.68rem;
    color: var(--db-ok);
    text-decoration: none;
    white-space: nowrap;
  }

  a.db-feed-link:hover {
    text-decoration: underline;
  }

  a.db-feed-link:focus-visible {
    outline: 2px solid var(--db-ok);
    outline-offset: 2px;
    border-radius: 3px;
  }

  .db-feed-more {
    display: inline-block;
    margin-top: 10px;
    font-size: 0.74rem;
    color: var(--db-hue);
    text-decoration: none;
  }

  .db-feed-more:hover {
    text-decoration: underline;
  }

  .db-feed-more:focus-visible {
    outline: 2px solid var(--db-hue);
    outline-offset: 2px;
    border-radius: 3px;
  }

  /* ---- responsive ---- */
  @media (max-width: 1180px) {
    .db-wide,
    .db-chart:not(.db-wide):not(.db-tape-card),
    .db-feed {
      grid-column: span 6;
    }

    .db-kpis {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 820px) {
    .db-wide,
    .db-chart:not(.db-wide):not(.db-tape-card),
    .db-feed {
      grid-column: 1 / -1;
    }

    .db-hero {
      grid-template-columns: 1fr;
      justify-items: start;
    }

    .db-gauge {
      justify-items: start;
      text-align: left;
    }

    .db-kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .db-hero-btn {
      margin-left: 0;
    }
  }

  @media (max-width: 520px) {
    .db-hero-id {
      flex-wrap: wrap;
    }

    .db-feed-row {
      grid-template-columns: auto minmax(0, 1fr);
      row-gap: 2px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .db-seg,
    .db-plot-bar,
    .db-funnel-bar,
    .db-tipo-bar span {
      transition: none;
    }
  }
</style>
