<script>
  /**
   * SectionHeader — cabecera ÚNICA de sección de la DApp.
   * Eyebrow numerado → título → descripción (1–2 líneas).
   */
  let { index = '', eyebrow = '', title = '', description = '' } = $props()
</script>

<div class="dapp-shead">
  <p class="dapp-eyebrow">
    {#if index}<span class="idx">{index}</span> · {/if}{eyebrow}
  </p>
  <h2 class="dapp-stitle">{title}</h2>
  {#if description}
    <p class="dapp-sdesc">{description}</p>
  {/if}
</div>
