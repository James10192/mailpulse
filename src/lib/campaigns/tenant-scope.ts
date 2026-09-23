/**
 * Organization-scoped resolution of what a campaign is scheduled with.
 *
 * The sender and the contact list come from the client; both are looked up by
 * id AND organization, so a foreign id behaves exactly like an unknown one.
 */
import type { CommunicationChannel } from "@/generated/prisma";
import { parseCampaignAudience } from "./audience";

type OrgScopedId = { id: string; organizationId: string };

export type CampaignSender = { name: string; email: string; replyTo: string | null };

export type CampaignScopedDb = {
  emailSender: {
    findFirst(args: {
      where: OrgScopedId;
      select: { name: true; email: true; replyTo: true };
    }): Promise<CampaignSender | null>;
  };
  contactList: {
    findFirst(args: { where: OrgScopedId; select: { id: true } }): Promise<{ id: string } | null>;
  };
};

export type ScheduleTargets =
  | { ok: true; sender: CampaignSender | null; contactListId: string | null }
  | { ok: false; reason: "sender_not_found" | "list_not_found" | "invalid_audience" | "unsupported_audience" };

export async function resolveScheduleTargets(
  db: CampaignScopedDb,
  organizationId: string,
  request: { channel: CommunicationChannel; senderId: string; audience: string }
): Promise<ScheduleTargets> {
  let sender: CampaignSender | null = null;
  if (request.channel === "EMAIL") {
    sender = request.senderId
      ? await db.emailSender.findFirst({
          where: { id: request.senderId, organizationId },
          select: { name: true, email: true, replyTo: true },
        })
      : null;
    if (!sender) return { ok: false, reason: "sender_not_found" };
  }

  const audience = parseCampaignAudience(request.audience);
  if ("error" in audience) return { ok: false, reason: "invalid_audience" };
  if (audience.kind === "all") return { ok: true, sender, contactListId: null };
  // A scheduled campaign stores a contact list; tag audiences are only sent immediately.
  if (audience.kind === "tag") return { ok: false, reason: "unsupported_audience" };

  const list = await db.contactList.findFirst({
    where: { id: audience.id, organizationId },
    select: { id: true },
  });
  if (!list) return { ok: false, reason: "list_not_found" };

  return { ok: true, sender, contactListId: list.id };
}
