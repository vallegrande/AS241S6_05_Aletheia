<script>
  /**
   * StatusMessage — mensaje de estado ÚNICO (loading | ok | warn | error | muted).
   * `spin=true` muestra el indicador de carga. `tech` conserva detalle técnico.
   */
  let { tone = 'muted', spin = false, message = '', tech = '' } = $props()
</script>

<p class="dapp-status" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
  {#if spin}
    <span class="mini-spinner" aria-hidden="true"></span>
  {/if}
  {message}
</p>
{#if tech}
  <p class="dapp-tech">{tech}</p>
{/if}
