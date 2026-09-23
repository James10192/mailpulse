/**
 * How a message status reads in the dashboard. The API keeps its lowercase
 * English statuses (a public contract); the dashboard speaks French and groups
 * statuses into the few outcomes a marketing team acts on.
 */
export type MessageStatusCode =
  | "QUEUED"
  | "PROCESSING"
  | "RETRYING"
  | "SUBMISSION_UNKNOWN"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "CANCELLED"
  | "RECONCILED"
  | "DUPLICATE_CONFIRMED"
  | "TEMPLATE_REQUIRED";

export type MessageOutcome = "delivered" | "sent" | "pending" | "failed" | "closed";
export type OutcomeTone = "success" | "secondary" | "warning" | "destructive" | "outline";

type StatusInfo = { label: string; outcome: MessageOutcome };

export const MESSAGE_STATUSES: Record<MessageStatusCode, StatusInfo> = {
  QUEUED: { label: "En file", outcome: "pending" },
  PROCESSING: { label: "En cours d'envoi", outcome: "pending" },
  RETRYING: { label: "Nouvel essai prévu", outcome: "pending" },
  SUBMISSION_UNKNOWN: { label: "Envoi à confirmer", outcome: "pending" },
  SENT: { label: "Envoyé", outcome: "sent" },
  DELIVERED: { label: "Délivré", outcome: "delivered" },
  READ: { label: "Lu", outcome: "delivered" },
  FAILED: { label: "Échec", outcome: "failed" },
  TEMPLATE_REQUIRED: { label: "Modèle requis", outcome: "failed" },
  CANCELLED: { label: "Annulé", outcome: "closed" },
  RECONCILED: { label: "Rapproché", outcome: "closed" },
  DUPLICATE_CONFIRMED: { label: "Doublon confirmé", outcome: "closed" },
};

export const MESSAGE_OUTCOMES: Record<MessageOutcome, { label: string; hint: string; tone: OutcomeTone }> = {
  delivered: { label: "Délivrés", hint: "Reçus par le destinataire, lus compris.", tone: "success" },
  sent: { label: "Envoyés", hint: "Acceptés par le fournisseur, sans accusé de réception pour l'instant.", tone: "secondary" },
  pending: { label: "En cours", hint: "En file, en cours d'envoi ou en attente d'un nouvel essai.", tone: "warning" },
  failed: { label: "Échecs", hint: "Refusés, en erreur ou bloqués faute de modèle approuvé.", tone: "destructive" },
  closed: { label: "Annulés", hint: "Annulés, rapprochés ou doublons confirmés.", tone: "outline" },
};

export const OUTCOME_ORDER: MessageOutcome[] = ["delivered", "sent", "pending", "failed", "closed"];

function info(status: string): StatusInfo | undefined {
  return MESSAGE_STATUSES[status.toUpperCase() as MessageStatusCode];
}

export function messageStatusLabel(status: string) {
  return info(status)?.label ?? status;
}

export function messageStatusTone(status: string): OutcomeTone {
  const outcome = info(status)?.outcome;
  return outcome ? MESSAGE_OUTCOMES[outcome].tone : "secondary";
}

export function statusesForOutcome(outcome: MessageOutcome): MessageStatusCode[] {
  return (Object.keys(MESSAGE_STATUSES) as MessageStatusCode[]).filter((code) => MESSAGE_STATUSES[code].outcome === outcome);
}

export function isMessageOutcome(value: string): value is MessageOutcome {
  return value in MESSAGE_OUTCOMES;
}
