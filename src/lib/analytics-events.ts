// Event names — single source of truth
// Importable from both client and server code

export const EVENTS = {
  // Auth
  USER_SIGNED_UP: "user_signed_up",
  USER_LOGGED_IN: "user_logged_in",
  LOGIN_FAILED: "login_failed",

  // Onboarding
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // Contacts
  CONTACT_CREATED: "contact_created",
  CONTACT_DELETED: "contact_deleted",

  // Campaigns
  CAMPAIGN_CREATED: "campaign_created",
  CAMPAIGN_DELETED: "campaign_deleted",

  // Automations
  AUTOMATION_CREATED: "automation_created",
  AUTOMATION_DELETED: "automation_deleted",
  AUTOMATION_STATUS_CHANGED: "automation_status_changed",
  WORKFLOW_SAVED: "workflow_saved",

  // Templates
  TEMPLATE_CREATED: "template_created",
  TEMPLATE_DELETED: "template_deleted",

  // Snippets
  SNIPPET_CREATED: "snippet_created",
  SNIPPET_UPDATED: "snippet_updated",
  SNIPPET_DELETED: "snippet_deleted",

  // Domains
  DOMAIN_CREATED: "domain_created",
  DOMAIN_DELETED: "domain_deleted",

  // Segments
  SEGMENT_CREATED: "segment_created",
  SEGMENT_DELETED: "segment_deleted",

  // Tags
  TAG_CREATED: "tag_created",
  TAG_DELETED: "tag_deleted",

  // Plan / Billing
  PLAN_LIMIT_HIT: "plan_limit_hit",
  UPGRADE_BANNER_CLICKED: "upgrade_banner_clicked",

  // Landing page
  LANDING_CTA_CLICKED: "landing_cta_clicked",
  LANDING_PRICING_VIEWED: "landing_pricing_viewed",
} as const;
