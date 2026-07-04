import type { ApiMessageDetail } from "./message-types";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function messageStatusVariant(status: string) {
  if (["delivered", "sent", "read", "approved"].includes(status)) return "success" as const;
  if (["failed", "rejected", "template_required"].includes(status)) return "destructive" as const;
  if (["retrying", "pending_review", "queued"].includes(status)) return "warning" as const;
  return "secondary" as const;
}

export function formatMessageDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Non renseigné";
}

export function shortIdentifier(value: string | null, start = 10, end = 6) {
  if (!value) return "Non renseigné";
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function stringifyJson(value: unknown) {
  if (value === null || value === undefined) return "Non renseigné";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export function messageContactLabel(message: ApiMessageDetail) {
  if (!message.contact) return "Contact non lié";
  return [message.contact.first_name, message.contact.last_name].filter(Boolean).join(" ") || message.contact.email;
}

export function messageErrorLabel(message: ApiMessageDetail) {
  return message.error_code ?? message.error_message ?? "Aucune erreur";
}
