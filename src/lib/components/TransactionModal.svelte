<script>
  /**
   * TransactionModal — modal "Nueva transacción": el flujo de envío
   * (validar → firmar en Pali → broadcast → confirmación) vive aquí.
   *
   * Cada hash que Pali publica se registra en txLedger (visible en la
   * tabla del Panel incluso tras cerrar este modal). Al confirmar,
   * el modal se cierra solo y el foco vuelve a la tabla.
   */
  import {
    wallet,
    sendTransaction,
    waitForConfirmation,
    refreshWallet,
    TX_FLOW,
  } from '../stores/wallet'
  import { getTxUrl, prettyNetwork } from '../web3/chains'
  import { network, switchNetwork } from '../stores/network'
  import { getNetwork as getNetDef } from '../web3/networks'
  import { requestOpenWalletModal } from '../stores/panelBus'
  import { addTxRecord, updateTxStatus } from '../stores/txLedger'
  import GooButton from '../gooey/GooButton.svelte'
  import FormField from './dapp/FormField.svelte'
  import StatusMessage from './dapp/StatusMessage.svelte'
  import Icon from './Icon.svelte'

  let { onClose } = $props()

  let to = $state('')
  let amount = $state('')
  let flow = $state(TX_FLOW.IDLE)
  let error = $state('')
  let done = $state(null) // { hash, status, network, chainId }

  const busy = $derived(flow === TX_FLOW.VALIDATING || flow === TX_FLOW.WALLET || flow === TX_FLOW.PENDING)
  const connected = $derived($wallet.connected)
  const activeNet = $derived(getNetDef($network.activeId))
  const isUtxoSelected = $derived($network.activeKind === 'utxo')
  const wrongNetwork = $derived(
    connected && activeNet?.kind === 'evm' && $wallet.chainId != null && $wallet.chainId !== activeNet.chainId,
  )
  const switchingNet = $derived($network.switching)

  async function alignNetwork() {
    if (activeNet) await switchNetwork(activeNet.id)
  }

  const stepSuggestions = $derived(
    connected ? 'Pega una dirección destino (0x…) y una cantidad en ETH.' : 'Conecta tu wallet primero para habilitar el formulario.',
  )

  function mapTxError(err) {
    if (err?.code === 'NO_WALLET') return 'Pali Wallet no detectada.'
    if (err?.code === 'NOT_CONNECTED') return 'Conecta tu wallet para continuar.'
    if (err?.code === 'INVALID_ADDRESS') return 'La dirección de destino no es válida.'
    if (err?.code === 'INVALID_AMOUNT') return err.message
    if (err?.code === 'INSUFFICIENT_FUNDS') return 'Saldo insuficiente.'
    if (err?.code === 'USER_REJECTED_TX') return 'La transacción fue rechazada desde Pali Wallet.'
    const msg = String(err?.message ?? '')
    if (/insufficient (funds|balance)/i.test(msg)) return 'Saldo insuficiente.'
    if (/invalid address/i.test(msg)) return 'La dirección de destino no es válida.'
    return 'La transacción no pudo completarse. Revisa los datos e inténtalo de nuevo.'
  }

  async function presetMax() {
    if ($wallet.balanceWei == null) {
      amount = ''
      return
    }
    const wei = BigInt($wallet.balanceWei)
    const buffer = 600000000000000n
    const usable = wei > buffer ? wei - buffer : 0n
    amount = (Number(usable) / 1e18).toFixed(8).replace(/0+$/, '').replace(/\.$/, '')
  }

  function close() {
    if (busy && flow !== TX_FLOW.PENDING) return // no cerrar en plena firma
    onClose?.()
  }

  function finish(status) {
    done = status
    // auto-cierre: la tabla del Panel toma el relevo (el estado vive en el ledger)
    setTimeout(() => onClose?.(), 1400)
  }

  async function handleSubmit() {
    error = ''
    done = null

    if (isUtxoSelected) {
      flow = TX_FLOW.ERROR
      error = 'El envío UTXO no está disponible desde esta DApp todavía. Selecciona una red EVM para transaccionar.'
      return
    }
    if (wrongNetwork) {
      flow = TX_FLOW.ERROR
      error = `Red incorrecta: la wallet está en chain ${$wallet.chainId} y la red seleccionada es «${activeNet?.label}». Cambia de red para continuar.`
      return
    }

    try {
      flow = TX_FLOW.VALIDATING
      flow = TX_FLOW.WALLET
      const { hash } = await sendTransaction(to, amount)

      flow = TX_FLOW.PENDING
      addTxRecord({
        hash,
        from: $wallet.address,
        to: to.trim(),
        amount: amount.trim(),
        network: prettyNetwork($wallet.networkName, $wallet.chainId),
        chainId: $wallet.chainId,
        status: 'pending',
        ts: Date.now(),
      })

      const confirmation = await waitForConfirmation(hash)
      await refreshWallet()

      const status =
        confirmation.status === 'confirmed' ? 'confirmed' : confirmation.status === 'reverted' ? 'reverted' : 'pending'
      updateTxStatus(hash, status)

      if (confirmation.status === 'reverted') {
        flow = TX_FLOW.ERROR
        error = 'La transacción fue revertida por la red.'
      } else {
        finish(status)
      }
    } catch (err) {
      if (err?.code === 'USER_REJECTED_TX') {
        flow = TX_FLOW.REJECTED
        error = 'La transacción fue rechazada desde Pali Wallet.'
      } else {
        flow = TX_FLOW.ERROR
        error = mapTxError(err)
      }
      console.error('[aletheia] tx modal:', err)
    }
  }
</script>

<div class="txm">
  {#if done}
    <!-- éxito: la tabla toma el relevo -->
    <div class="txm-done">
      <span class="txm-done-icon" aria-hidden="true">✓</span>
      <h3>{done === 'confirmed' ? 'Transacción confirmada' : 'Transacción publicada'}</h3>
      <p class="muted small">{done === 'confirmed' ? 'Ya aparece en tu historial con estado final.' : 'Está en el historial; su estado se actualizará al confirmarse.'}</p>
    </div>
  {:else}
    <form
      class="txm-form"
      onsubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
      aria-label="Nueva transacción"
    >
      <FormField label="Red de envío">
        <div class="txm-net dapp-rowline" data-warn={wrongNetwork || isUtxoSelected ? '' : undefined}>
          <span class="txm-net-dot" aria-hidden="true"></span>
          <span class="txm-net-name">{activeNet?.label ?? '—'}</span>
          {#if wrongNetwork}
            <button type="button" class="btn btn-sm" onclick={alignNetwork} disabled={switchingNet}>
              {switchingNet ? 'Cambiando…' : 'Cambiar a esta red'}
            </button>
          {/if}
        </div>
        {#if wrongNetwork}
          <p class="dapp-status" data-tone="warn">La wallet está en otra cadena.</p>
        {/if}
        {#if isUtxoSelected}
          <p class="dapp-status" data-tone="warn">Red UTXO activa: el envío está disponible solo en redes EVM por ahora.</p>
        {/if}
      </FormField>

      <FormField label="Dirección de destino" for="txm-to">
        <input
          id="txm-to"
          type="text"
          spellcheck="false"
          autocomplete="off"
          placeholder="0x…"
          bind:value={to}
          disabled={!connected || busy}
          required
        />
      </FormField>

      <FormField label="Cantidad (ETH)" for="txm-amount" help={stepSuggestions}>
        <div class="dapp-row txm-amount-row">
          <input
            id="txm-amount"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.001"
            bind:value={amount}
            disabled={!connected || busy}
            required
          />
          <button type="button" class="btn btn-sm btn-ghost" onclick={presetMax} disabled={!connected || busy}>
            MAX
          </button>
        </div>
      </FormField>

      <div class="txm-actions">
        {#if connected}
          <GooButton
            contained
            type="submit"
            disabled={busy || !to || !amount}
            title={!to || !amount ? 'Completa destino y cantidad' : ''}
          >
            {#if flow === TX_FLOW.VALIDATING}Validando…{:else if flow === TX_FLOW.WALLET}Confirma en Pali…{:else if flow === TX_FLOW.PENDING}Esperando confirmación…{:else}Enviar transacción{/if}
          </GooButton>
          {#if !to || !amount}
            <p class="txm-hint">Completa dirección y cantidad para habilitar el envío.</p>
          {/if}
        {:else}
          <button type="button" class="txm-connect" onclick={requestOpenWalletModal}>
            <Icon name="lock" size={15} />
            Conecta tu wallet para continuar
          </button>
        {/if}
        {#if error && !done}
          <StatusMessage tone="error" message={error} />
        {/if}
      </div>
    </form>
  {/if}
</div>

<style>
  .txm { display: flex; flex-direction: column; }
  .txm-form { display: flex; flex-direction: column; gap: 14px; }

  .txm-net { padding: 9px 12px; min-height: 40px; }
  .txm-net-dot {
    width: 8px;
    height: 8px;
    flex: none;
    border-radius: 50%;
    background: var(--ok);
    box-shadow: 0 0 10px rgba(110, 231, 183, 0.6);
    animation: txm-pulse 2.4s ease-in-out infinite;
  }
  .txm-net[data-warn] .txm-net-dot { background: var(--warn); box-shadow: 0 0 10px rgba(252, 211, 77, 0.6); }
  @keyframes txm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
  .txm-net-name {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--white);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .txm-amount-row { flex-wrap: nowrap; }
  .txm-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
  .txm-hint { margin: 0; font-size: 0.76rem; color: var(--gray-500); }
  /* Contexto modal: el botón se ajusta a la píldora (el goo queda dentro gracias
     a la variante `contained` de GooButton; aquí solo dimensionamos la píldora) */
  :global(.txm .goo-btn) {
    min-height: 46px;
    padding: 0 24px;
  }

  .txm-hint {
    text-align: center;
    font-size: 0.78rem;
  }

  /* CTA de conexión: mismo lenguaje que "Conectar Pali Wallet" */
  .txm-connect {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 42px;
    border: none;
    border-radius: 10px;
    background: var(--purple-600, #7c3aed);
    color: var(--white, #fff);
    font-family: var(--font-display, 'Geist Sans', system-ui, sans-serif);
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: background 0.18s ease;
  }
  .txm-connect:hover { background: var(--purple-500, #8b5cf6); }
  .txm-connect:active { background: var(--purple-700, #6d28d9); }
  .txm-connect:focus-visible { outline: 2px solid var(--purple-300, #c4b5fd); outline-offset: 2px; }

  /* cierre exitoso */
  .txm-done { display: grid; justify-items: center; gap: 6px; padding: var(--s-4) 0; text-align: center; }
  .txm-done-icon {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: 1px solid rgba(110, 231, 183, 0.5);
    background: rgba(110, 231, 183, 0.1);
    color: var(--ok);
    font-size: 1.2rem;
    animation: txm-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .txm-done h3 { margin: 6px 0 0; color: var(--white); }
  .txm-done p { margin: 0; }
  @keyframes txm-pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  @media (max-width: 640px) {
    .txm-amount-row { flex-wrap: wrap; }
  }
</style>
