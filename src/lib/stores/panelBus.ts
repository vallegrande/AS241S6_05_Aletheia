/**
 * panelBus.ts — bus de eventos DOM entre módulos del panel.
 *
 * Un módulo (p. ej. Certificados) puede pedirle al Panel que abra el modal
 * de wallet sin acoplarse a su estado interno: se emite un evento en
 * window y Panel lo atiende.
 */

export const OPEN_WALLET_MODAL = 'aletheia:open-wallet'

export function requestOpenWalletModal() {
  window.dispatchEvent(new CustomEvent(OPEN_WALLET_MODAL))
}
