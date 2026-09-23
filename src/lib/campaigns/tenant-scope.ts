/**
 * Organization-scoped resolution of what a campaign is scheduled with.
 *
 * The sender comes from the client and is looked up by id AND organization, so
 * a foreign id behaves exactly like an unknown one.
 *
 * A scheduled campaign targets every subscribed contact of its organization,
 * stored as a NULL contact list. Segment and tag audiences are only available
 * for an immediate send: segments are dynamic filters without stored members,
 * so a scheduled send to one would reach nobody.
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
};

export type ScheduleTargets =
  | { ok: true; sender: CampaignSender | null }
  | { ok: false; reason: "sender_not_found" | "invalid_audience" | "unsupported_audience" };

export async function resolveScheduleTargets(
  db: CampaignScopedDb,
  organizationId: string,
  request: { channel: CommunicationChannel; senderId: string; audience: string }
): Promise<ScheduleTargets> {
  const audience = parseCampaignAudience(request.audience);
  if ("error" in audience) return { ok: false, reason: "invalid_audience" };
  if (audience.kind !== "all") return { ok: false, reason: "unsupported_audience" };

  if (request.channel !== "EMAIL") return { ok: true, sender: null };

  const sender = request.senderId
    ? await db.emailSender.findFirst({
        where: { id: request.senderId, organizationId },
        select: { name: true, email: true, replyTo: true },
      })
    : null;
  return sender ? { ok: true, sender } : { ok: false, reason: "sender_not_found" };
}
