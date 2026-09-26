// Errors answered by Evolution API, and what can safely be read from them.

type EvolutionMessageError = {
  exists?: boolean;
  jid?: string;
  number?: string;
};

/**
 * The envelope Evolution's error middleware writes for every exception it
 * throws: `{ status, error, response: { message } }`, with `status` repeating
 * the HTTP status. A proxy, a CDN or a wrong host answering in its place never
 * produces it, which is what lets a caller trust `evolutionMessages`.
 */
type EvolutionErrorEnvelope = {
  status?: unknown;
  message?: unknown;
  response?: {
    message?: unknown;
  };
};

/**
 * Carries the HTTP status so callers can tell a definitive refusal from an
 * ambiguous failure. Without it a wrong phone number and a network timeout look
 * identical, and every unreachable recipient lands in manual reconciliation.
 */
export class EvolutionApiError extends Error {
  readonly status: number;
  readonly recipientUnreachable: boolean;
  readonly retryAfterSeconds: number | null;
  /**
   * The text messages of a response proven to come from Evolution itself, empty
   * for anything else (an HTML page, a bare proxy error, a non-JSON body).
   */
  readonly evolutionMessages: readonly string[];

  constructor(
    message: string,
    status: number,
    recipientUnreachable: boolean,
    retryAfterSeconds: number | null = null,
    evolutionMessages: readonly string[] = [],
  ) {
    super(message);
    this.name = "EvolutionApiError";
    this.status = status;
    this.recipientUnreachable = recipientUnreachable;
    this.retryAfterSeconds = retryAfterSeconds;
    this.evolutionMessages = evolutionMessages;
  }

  /**
   * Allow-list, never a status range. Evolution answers 400 both for "this
   * number has no WhatsApp account" and for "the session is currently
   * disconnected", and treating the second as final would permanently drop
   * every notification sent while the sender's phone was offline.
   */
  get deterministic() {
    return this.recipientUnreachable;
  }
}

/** Builds the error for a failed Evolution response from its status and raw body. */
export function evolutionApiError(status: number, body: string, retryAfterSeconds: number | null) {
  const parsed = parseBody(body);
  const first = firstMessage(parsed);
  return new EvolutionApiError(
    errorMessage(status, body, first),
    status,
    isUnreachableRecipient(first),
    retryAfterSeconds,
    envelopeMessages(parsed, status),
  );
}

/**
 * The wording of Evolution 2.3.7's instance guard (src/api/guards/instance.guard.ts).
 * A future version that rewords it makes this check fail safe: the instance is
 * then reported unreachable, never recreated.
 */
const instanceMissingMessage = (instanceName: string) => `The "${instanceName}" instance does not exist`;

/**
 * True only when Evolution itself says this exact instance does not exist. It
 * is the one answer that justifies creating a new instance: a timeout, a 5xx,
 * or a 404 from anything standing in front of Evolution says nothing about the
 * session, and recreating on those destroys a healthy pairing.
 */
export function isEvolutionInstanceMissing(error: unknown, instanceName: string) {
  return error instanceof EvolutionApiError
    && error.status === 404
    && error.evolutionMessages.includes(instanceMissingMessage(instanceName));
}

function parseBody(body: string): EvolutionErrorEnvelope | null {
  try {
    const parsed: unknown = JSON.parse(body);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as EvolutionErrorEnvelope : null;
  } catch {
    return null;
  }
}

function firstMessage(parsed: EvolutionErrorEnvelope | null): unknown {
  const messages = parsed?.response?.message ?? parsed?.message;
  return Array.isArray(messages) ? messages[0] : messages;
}

function envelopeMessages(parsed: EvolutionErrorEnvelope | null, status: number): string[] {
  if (!parsed || parsed.status !== status) return [];
  const messages = parsed.response?.message;
  const list = Array.isArray(messages) ? messages : [messages];
  return list.filter((message): message is string => typeof message === "string");
}

function isUnreachableRecipient(first: unknown) {
  return typeof first === "object" && first !== null && "exists" in first
    && (first as EvolutionMessageError).exists === false;
}

function errorMessage(status: number, body: string, first: unknown) {
  if (isUnreachableRecipient(first)) {
    const error = first as EvolutionMessageError;
    const recipient = error.number ?? error.jid?.replace("@s.whatsapp.net", "");
    return recipient
      ? `Le numéro ${recipient} n'est pas enregistré sur WhatsApp. Vérifiez le numéro ou utilisez un autre contact.`
      : "Ce numéro n'est pas enregistré sur WhatsApp. Vérifiez le numéro ou utilisez un autre contact.";
  }
  if (typeof first === "string" && first.trim()) return first;
  return body ? `Evolution API ${status}: ${body}` : `Evolution API ${status}`;
}
