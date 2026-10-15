<script>
  /**
   * FormField — estructura ÚNICA de campo: LABEL → INPUT → HELP.
   * El control se pasa como snippet `children`; el texto de ayuda vía `help`.
   */
  let { label = '', help = '', for: forId = '', children } = $props()
</script>

<div class="dapp-field">
  {#if label}
    <label for={forId || undefined}>{label}</label>
  {/if}
  {@render children?.()}
  {#if help}
    <p class="dapp-help">{help}</p>
  {/if}
</div>
