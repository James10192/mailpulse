// What a failure code means for the person reading the dashboard, and what to
// do about it. The code itself stays the stable contract (API, webhooks); this
// is only its reading. An unknown code is shown as is, never hidden.

export type FailureFamily = "recipient" | "consent" | "sender" | "template" | "provider" | "configuration";

export type FailureReason = {
  code: string;
  family: FailureFamily | null;
  label: string;
  /** The next action, when there is one the organization can take. */
  remediation: string | null;
};

const REASONS: Record<string, Omit<FailureReason, "code">> = {
  recipient_not_activated: { family: "recipient", label: "Numéro sans WhatsApp", remediation: "Vérifiez le numéro auprès du destinataire, ou utilisez un autre canal." },
  recipient_unreachable: { family: "recipient", label: "Destinataire injoignable", remediation: "Vérifiez le numéro auprès du destinataire, ou utilisez un autre canal." },
  whatsapp_recipient_unreachable: { family: "recipient", label: "Destinataire injoignable", remediation: "Vérifiez le numéro auprès du destinataire, ou utilisez un autre canal." },
  email_bounced: { family: "recipient", label: "Adresse e-mail en rebond", remediation: "Corrigez l'adresse : elle n'accepte pas de courrier." },
  email_suppressed: { family: "recipient", label: "Adresse supprimée chez le fournisseur", remediation: "L'adresse a rebondi ou s'est plainte auparavant ; elle ne recevra plus rien." },
  email_complained: { family: "consent", label: "Plainte du destinataire", remediation: "Le contact a été désabonné ; ne le relancez pas." },
  consent_denied: { family: "consent", label: "Destinataire désabonné", remediation: null },
  consent_refused: { family: "consent", label: "Destinataire a répondu NON ou STOP", remediation: null },
  consent_expired: { family: "consent", label: "Demande d'accord expirée", remediation: "Relancez la demande d'accord si le message reste utile." },
  consent_request_failed: { family: "consent", label: "Demande d'accord non envoyée", remediation: "Vérifiez le numéro d'envoi de l'application." },
  sender_unavailable: { family: "sender", label: "Numéro d'envoi indisponible", remediation: "Réactivez le numéro de l'application dans Applications externes, ou n'en laissez qu'un actif." },
  channel_not_configured: { family: "configuration", label: "Canal non configuré", remediation: "Connectez WhatsApp à l'organisation, ou rattachez la clé à une application qui a un numéro." },
  sms_not_authorized: { family: "configuration", label: "SMS non autorisé", remediation: "Le SMS n'est pas ouvert pour cette organisation : contactez le support." },
  template_not_approved: { family: "template", label: "Modèle non approuvé", remediation: "Faites approuver le modèle par Meta avant de l'envoyer." },
  template_not_configured: { family: "template", label: "Modèle non configuré", remediation: "Renseignez l'identifiant du modèle Meta." },
  whatsapp_template_required: { family: "template", label: "Modèle requis hors fenêtre de 24 h", remediation: "Envoyez un modèle approuvé : le destinataire n'a pas écrit depuis 24 h." },
  template_required: { family: "template", label: "Modèle requis hors fenêtre de 24 h", remediation: "Envoyez un modèle approuvé : le destinataire n'a pas écrit depuis 24 h." },
  whatsapp_service_window_closed: { family: "template", label: "Modèle requis hors fenêtre de 24 h", remediation: "Envoyez un modèle approuvé : le destinataire n'a pas écrit depuis 24 h." },
  provider_error: { family: "provider", label: "Refus du fournisseur", remediation: "Ouvrez un message pour lire la réponse du fournisseur." },
  provider_rejected: { family: "provider", label: "Refus du fournisseur", remediation: "Ouvrez un message pour lire la réponse du fournisseur." },
  provider_temporary_error: { family: "provider", label: "Fournisseur momentanément indisponible", remediation: null },
  whatsapp_delivery_failed: { family: "provider", label: "Remise WhatsApp échouée", remediation: null },
  whatsapp_send_failed: { family: "provider", label: "Envoi WhatsApp échoué", remediation: null },
  email_failed: { family: "provider", label: "Envoi e-mail échoué", remediation: "Ouvrez un message pour lire la réponse du fournisseur." },
  submission_pending: { family: "provider", label: "Envoi non confirmé", remediation: "Le fournisseur n'a pas répondu : vérifiez la remise avant de renvoyer, pour éviter un doublon." },
  submission_unknown: { family: "provider", label: "Envoi non confirmé", remediation: "Le fournisseur n'a pas répondu : vérifiez la remise avant de renvoyer, pour éviter un doublon." },
  delivery_impossible_unconfirmed: { family: "provider", label: "Remise impossible, non confirmée", remediation: null },
};

export function describeFailure(code: string | null): FailureReason {
  if (!code) return { code: "", family: null, label: "Cause non renseignée", remediation: null };
  const known = REASONS[code];
  return known ? { code, ...known } : { code, family: null, label: code, remediation: null };
}

export type FailureGroup = FailureReason & { count: number };

/** Failures counted by reading, most frequent first: two codes with one meaning count together. */
export function groupFailures(rows: { errorCode: string | null; count: number }[]): FailureGroup[] {
  const groups = new Map<string, FailureGroup>();
  for (const row of rows) {
    if (row.count <= 0) continue;
    const reason = describeFailure(row.errorCode);
    const existing = groups.get(reason.label);
    if (existing) existing.count += row.count;
    else groups.set(reason.label, { ...reason, count: row.count });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
}
