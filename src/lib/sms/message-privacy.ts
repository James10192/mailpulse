type SmsHistoryMessage = {
  recipientValue: string;
  text: string | null;
};

const MASKED_RECIPIENT = "Numéro masqué";
const MASKED_CONTENT = "Contenu masqué";

/** The SMS history is intentionally least-privilege; there is no client-side unmask action. */
export function presentSmsHistoryMessage<T extends SmsHistoryMessage>(
  message: T,
  canAccessSensitiveContent: boolean,
): T {
  if (canAccessSensitiveContent) return message;
  return {
    ...message,
    recipientValue: maskPhoneNumber(message.recipientValue),
    text: message.text === null ? null : MASKED_CONTENT,
  };
}

export function maskPhoneNumber(value: string) {
  const suffix = value.replace(/\D/g, "").slice(-2);
  return suffix ? `${MASKED_RECIPIENT} · **${suffix}` : MASKED_RECIPIENT;
}
