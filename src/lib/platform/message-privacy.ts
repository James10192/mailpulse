// What a member who does not manage the organization sees of a message: the
// same least-privilege rule as the SMS history. Who it went to and what it said
// are masked; its fate, timing and references stay readable for support.
// There is no client-side unmask: the full values never leave the server.

import { maskPhoneNumber } from "../sms/message-privacy";
import { describeFailure } from "./failure-reasons";

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
  error_code: string | null;
  error_message: string | null;
  provider_message_id: string | null;
};

// A Meta message id (wamid.…) is base64 and embeds the recipient's number.
const PROVIDER_ID_VISIBLE = 12;

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
    // Provider texts quote the recipient (« Le numéro +225… n'est pas
    // enregistré ») or a raw response body: only the classified reading is shown.
    error_message: message.error_message === null ? null : describeFailure(message.error_code).label,
    provider_message_id: message.provider_message_id && message.provider_message_id.length > PROVIDER_ID_VISIBLE
      ? `${message.provider_message_id.slice(0, PROVIDER_ID_VISIBLE)}…`
      : message.provider_message_id,
  };
}

function initial(name: string | null) {
  const first = name?.trim()[0];
  return first ? `${first}.` : null;
}
