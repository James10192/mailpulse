export type CalendarCampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED" | "CANCELLED";
export type CalendarCampaignChannel = "EMAIL" | "WHATSAPP" | "SMS";

export type CalendarCampaign = {
  id: string;
  name: string;
  subject: string | null;
  previewText: string | null;
  status: CalendarCampaignStatus;
  channel: CalendarCampaignChannel;
  scheduledAt: string;
  sentAt: string | null;
  contactList: {
    name: string;
    contactCount: number;
  } | null;
  _count: { recipients: number };
};

export const statusLabels: Record<CalendarCampaignStatus, string> = {
  DRAFT: "Brouillon",
  SCHEDULED: "Planifiée",
  SENDING: "Envoi",
  SENT: "Envoyée",
  PAUSED: "Pause",
  CANCELLED: "Annulée",
};

export const channelLabels: Record<CalendarCampaignChannel, string> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
};

export function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}
