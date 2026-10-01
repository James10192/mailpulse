// What a member who does not manage the organization sees of a message: the
// same least-privilege rule as the SMS history. Who it went to and what it said
// are masked; its fate, timing and references stay readable for support.
// There is no client-side unmask: the full values never leave the server.

import { maskPhoneNumber } from "../sms/message-privacy";

const MASKED_CONTENT = "Contenu masqué";

export function maskEmailAddress(value: string) {
  const at = value.lastIndexOf("@");
  if (at <= 0) return "Adresse masquée";
  return `${value[0]}•••${value.slice(at)}`;
}

export function maskRecipient(type: string, value: string) {
  return type === "email" || value.includes("@") ? maskEmailAddress(value) : maskPhoneNumber(value);
}

type PrivateMessage = {
  recipient: { type: string; value: string };
  content: { text: string | null; variables: unknown };
  contact: { email: string; phone: string | null; first_name: string | null; last_name: string | null } | null;
  metadata: unknown;
};

export function presentRegistryMessage<T extends PrivateMessage>(message: T, canSeePersonalData: boolean): T {
  if (canSeePersonalData) return message;
  return {
    ...message,
    recipient: { ...message.recipient, value: maskRecipient(message.recipient.type, message.recipient.value) },
    content: { ...message.content, text: message.content.text === null ? null : MASKED_CONTENT, variables: null },
    contact: message.contact
      ? {
          ...message.contact,
          email: maskEmailAddress(message.contact.email),
          phone: message.contact.phone ? maskPhoneNumber(message.contact.phone) : null,
          first_name: initial(message.contact.first_name),
          last_name: initial(message.contact.last_name),
        }
      : null,
    metadata: null,
  };
}

function initial(name: string | null) {
  const first = name?.trim()[0];
  return first ? `${first}.` : null;
}
