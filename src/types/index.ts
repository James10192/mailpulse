// Re-export Prisma types for convenience
export type {
  Campaign,
  CampaignStatus,
  CampaignType,
  Contact,
  ContactList,
  ContactTag,
  EmailEvent,
  EmailEventType,
  EmailTemplate,
  Automation,
  AutomationTrigger,
  AutomationStatus,
  AutomationStep,
  SendingDomain,
  CampaignRecipient,
  CampaignAnalytics,
  Organization,
  User,
} from "@prisma/client";

// Campaign with relations
export interface CampaignWithRelations {
  id: string;
  name: string;
  subject: string | null;
  status: string;
  type: string;
  sentAt: Date | null;
  scheduledAt: Date | null;
  analytics: {
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  } | null;
  contactList: {
    name: string;
    contactCount: number;
  } | null;
}

// Dashboard stats
export interface DashboardStats {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplaints: number;
}

// Contact import row
export interface ContactImportRow {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string;
  [key: string]: string | undefined;
}
