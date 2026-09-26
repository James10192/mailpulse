// The CommunicationMessage rows a campaign creates, found by their idempotency
// key: no column links a message to its campaign.

/** Statuses a worker may still pick up. PROCESSING is already claimed and left alone. */
const PENDING_STATUSES = ["QUEUED", "RETRYING"] as const;

export function campaignMessageKey(campaignId: string, recipientId: string) {
  return `${campaignMessageKeyPrefix(campaignId)}${recipientId}`;
}

/** Ends with the separator, so campaign "abc" never matches the keys of "abcd". */
function campaignMessageKeyPrefix(campaignId: string) {
  return `campaign:${campaignId}:`;
}

export type QueuedCampaignMessageWriter = {
  communicationMessage: {
    updateMany(args: {
      where: {
        organizationId: string;
        origin: "CAMPAIGN";
        idempotencyKey: { startsWith: string };
        status: { in: ("QUEUED" | "RETRYING")[] };
      };
      data: { status: "CANCELLED"; cancelledAt: Date; errorCode: string; errorMessage: string; nextRetryAt: null };
    }): Promise<{ count: number }>;
  };
};

/**
 * Cancels the messages of a campaign that no worker has claimed yet. Deleting
 * a campaign removes its recipients but not these rows, and a queue worker
 * would otherwise still send every one of them.
 */
export async function cancelQueuedCampaignMessages(
  db: QueuedCampaignMessageWriter,
  organizationId: string,
  campaignId: string,
  now: Date,
) {
  const { count } = await db.communicationMessage.updateMany({
    where: {
      organizationId,
      origin: "CAMPAIGN",
      idempotencyKey: { startsWith: campaignMessageKeyPrefix(campaignId) },
      status: { in: [...PENDING_STATUSES] },
    },
    data: {
      status: "CANCELLED",
      cancelledAt: now,
      errorCode: "campaign_deleted",
      errorMessage: "La campagne a été supprimée avant l'envoi.",
      nextRetryAt: null,
    },
  });
  return count;
}
