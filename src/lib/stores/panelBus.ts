/**
 * panelBus.ts — bus de eventos DOM entre módulos del panel.
 *
 * Un módulo (p. ej. Certificados) puede pedirle al Panel que abra el modal
 * de wallet sin acoplarse a su estado interno: se emite un evento en
 * window y Panel lo atiende.
 */

export const OPEN_WALLET_MODAL = 'aletheia:open-wallet'
export const OPEN_PROFILE_MODAL = 'aletheia:open-profile'
export const OPEN_EVIDENCE_FORM = 'aletheia:open-evidence-form'
export const OPEN_ONBOARDING = 'aletheia:open-onboarding'

export function requestOpenWalletModal() {
  window.dispatchEvent(new CustomEvent(OPEN_WALLET_MODAL))
}

export function requestOpenProfileModal() {
  window.dispatchEvent(new CustomEvent(OPEN_PROFILE_MODAL))
}

export function requestOpenEvidenceForm() {
  window.dispatchEvent(new CustomEvent(OPEN_EVIDENCE_FORM))
}

export function requestOpenOnboarding() {
  window.dispatchEvent(new CustomEvent(OPEN_ONBOARDING))
}
