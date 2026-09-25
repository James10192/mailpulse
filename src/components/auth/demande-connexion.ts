/**
 * Remembers, in this browser, that a code was just requested — and for which
 * address and destination.
 *
 * The email link prefills the code only when it finds this trace. Without it,
 * the link may come from someone else: a crafted link carrying an attacker's
 * address and valid code would otherwise sign the victim into the attacker's
 * account in one tap. There, the code must be typed.
 */

const CLE = "mailpulse:demande-connexion";
const VALIDITE_MS = 15 * 60 * 1000;

type Demande = { email: string; destination: string; t: number };

export function memoriserDemande(email: string, destination: string): void {
  try {
    const demande: Demande = { email: email.trim().toLowerCase(), destination, t: Date.now() };
    window.localStorage.setItem(CLE, JSON.stringify(demande));
  } catch {
    // Private mode or storage blocked: the link will ask for the code.
  }
}

export function demandeEnCours(email: string): Demande | null {
  try {
    const brute = window.localStorage.getItem(CLE);
    if (!brute) return null;
    const demande = JSON.parse(brute) as Demande;
    const recente = Date.now() - demande.t < VALIDITE_MS;

    return recente && demande.email === email.trim().toLowerCase() ? demande : null;
  } catch {
    return null;
  }
}

export function oublierDemande(): void {
  try {
    window.localStorage.removeItem(CLE);
  } catch {
    // Nothing to clean.
  }
}
