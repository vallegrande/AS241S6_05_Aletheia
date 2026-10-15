<script>
  /**
   * TxTest — HARNESS TEMPORAL (borrar tras la revisión).
   * Renderiza el módulo de transacciones con una wallet simulada conectada.
   */
  import './styles/dapp.css'
  import './styles/sidebar.css'
  import { wallet, INITIAL_STATE } from './lib/stores/wallet'
  import { addTxRecord } from './lib/stores/txLedger'
  import PanelModal from './lib/components/PanelModal.svelte'
  import TransactionModal from './lib/components/TransactionModal.svelte'
  import TransactionSection from './lib/components/TransactionSection.svelte'

  let open = $state(true)

  // wallet simulada conectada en Ethereum Sepolia (red por defecto)
  wallet.set({
    ...INITIAL_STATE,
    connected: true,
    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    chainId: 11155111,
    networkName: 'Ethereum Sepolia',
    balanceWei: '1000000000000000000',
  })

  // una fila de ejemplo para fotografiar también la tabla
  addTxRecord({
    hash: '0x9f2c4a1e7b8d3f6a0c5e2b9d4a7f1c8e3b6d0a5f2c4e8b1d7a3f6c9e0b2d5a81',
    from: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    to: '0x5A88c4B1e0F2d7C3a9E6b1D4f8A2c5E7b0D3f6A9',
    amount: '0.001',
    network: 'Ethereum Sepolia',
    chainId: 11155111,
    status: 'confirmed',
    ts: Date.now() - 60000,
  })
</script>

<div class="dapp">
  <main>
    <TransactionSection onNew={() => (open = true)} />
  </main>

  {#if open}
    <PanelModal title="Nueva transacción" width={560} onClose={() => (open = false)}>
      <TransactionModal onClose={() => (open = false)} />
    </PanelModal>
  {/if}
</div>
