export const deliveryChannels = ["EMAIL", "SMS", "WHATSAPP"] as const;
export type DeliveryChannel = (typeof deliveryChannels)[number];

type ContactConsentSource = {
  subscribed: boolean;
  metadata: unknown;
};

type ChannelOptIns = Partial<Record<Lowercase<DeliveryChannel>, boolean>>;

export function canReceiveChannel(contact: ContactConsentSource | null | undefined, channel: DeliveryChannel) {
  if (!contact) return true;
  if (!contact.subscribed) return false;
  return readChannelOptIns(contact.metadata)[channel.toLowerCase() as Lowercase<DeliveryChannel>] !== false;
}

export function mergeChannelOptIns(metadata: unknown, changes: ChannelOptIns) {
  const current = asRecord(metadata);
  return {
    ...current,
    channel_opt_in: {
      ...readChannelOptIns(metadata),
      ...changes,
    },
  };
}

/** A STOP is deliberately channel-scoped and never changes global subscription. */
export function applyStopPreference(metadata: unknown, channel: DeliveryChannel) {
  return mergeChannelOptIns(metadata, { [channel.toLowerCase()]: false });
}

export function isStopCommand(text: string) {
  return /^\s*stop\s*[!.]*\s*$/i.test(text);
}

function readChannelOptIns(metadata: unknown): ChannelOptIns {
  const raw = asRecord(metadata).channel_opt_in;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const optIns: ChannelOptIns = {};
  for (const channel of deliveryChannels) {
    const key = channel.toLowerCase() as Lowercase<DeliveryChannel>;
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "boolean") optIns[key] = value;
  }
  return optIns;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
