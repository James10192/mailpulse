export type CampaignSort = "date-desc" | "date-asc" | "name-asc" | "performance";
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED" | "CANCELLED";
export type CampaignChannel = "EMAIL" | "WHATSAPP" | "SMS";

export type Campaign = {
  id: string;
  name: string;
  subject: string | null;
  previewText: string | null;
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  status: CampaignStatus;
  channel: CampaignChannel;
  type: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  analytics: {
    openRate: number;
    clickRate: number;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalUnsubscribed: number;
  } | null;
  whatsappAnalytics: {
    sent: number;
    delivered: number;
    read: number;
    replied: number;
  } | null;
  contactList: {
    name: string;
    contactCount: number;
  } | null;
  _count?: { recipients: number };
};

export type SenderInfo = { id: string; name: string; email: string };

export const statusLabels: Record<CampaignStatus, string> = {
  DRAFT: "Brouillon",
  SCHEDULED: "Planifiée",
  SENDING: "Envoi",
  SENT: "Envoyée",
  PAUSED: "Pause",
  CANCELLED: "Annulée",
};

export const channelLabels: Record<CampaignChannel, string> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
};

export function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}

export function formatRate(value: number) {
  return `${value.toFixed(1)}%`;
}

export function getOpenRate(campaign: Campaign) {
  if (campaign.channel === "WHATSAPP") {
    const sent = campaign.whatsappAnalytics?.sent ?? 0;
    const read = campaign.whatsappAnalytics?.read ?? 0;
    return sent > 0 ? (read / sent) * 100 : 0;
  }
  return (campaign.analytics?.openRate ?? 0) * 100;
}

export function getClickOrReplyRate(campaign: Campaign) {
  if (campaign.channel === "WHATSAPP") {
    const sent = campaign.whatsappAnalytics?.sent ?? 0;
    const replied = campaign.whatsappAnalytics?.replied ?? 0;
    return sent > 0 ? (replied / sent) * 100 : 0;
  }
  return (campaign.analytics?.clickRate ?? 0) * 100;
}

export function campaignSentCount(campaign: Campaign) {
  return campaign.channel === "WHATSAPP"
    ? campaign.whatsappAnalytics?.sent ?? campaign._count?.recipients ?? 0
    : campaign.analytics?.totalSent ?? campaign._count?.recipients ?? 0;
}
