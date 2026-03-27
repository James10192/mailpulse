import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Real-time dashboard stats (updated on webhook events)
  dashboardStats: defineTable({
    organizationId: v.string(),
    campaignId: v.optional(v.string()),
    totalSent: v.number(),
    totalDelivered: v.number(),
    totalOpened: v.number(),
    totalClicked: v.number(),
    totalBounced: v.number(),
    totalComplaints: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["organizationId"]),

  // Real-time notifications
  notifications: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    type: v.union(
      v.literal("campaign_sent"),
      v.literal("campaign_completed"),
      v.literal("bounce_spike"),
      v.literal("complaint_alert"),
      v.literal("new_subscriber"),
      v.literal("milestone_reached"),
      v.literal("automation_triggered")
    ),
    title: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "read"])
    .index("by_org", ["organizationId", "createdAt"]),

  // Live campaign sending progress
  campaignProgress: defineTable({
    campaignId: v.string(),
    organizationId: v.string(),
    totalRecipients: v.number(),
    processed: v.number(),
    succeeded: v.number(),
    failed: v.number(),
    status: v.union(
      v.literal("preparing"),
      v.literal("sending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_campaign", ["campaignId"]),

  // User presence (who is viewing what)
  presence: defineTable({
    userId: v.string(),
    userName: v.string(),
    organizationId: v.string(),
    currentPage: v.string(),
    lastSeenAt: v.number(),
  })
    .index("by_org", ["organizationId", "lastSeenAt"])
    .index("by_user", ["userId"]),

  // Live activity feed
  activityFeed: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    userName: v.string(),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    resourceName: v.string(),
    createdAt: v.number(),
  }).index("by_org", ["organizationId", "createdAt"]),
});
