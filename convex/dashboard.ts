import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { clampLimit, currentMember, requireServer } from "./lib";

// `organizationId` arguments are still accepted, and ignored, so that a tab
// opened before this version keeps rendering instead of failing validation.
// The organization always comes from the token. Remove them in a later release.

export const getStats = query({
  args: { organizationId: v.optional(v.string()) },
  handler: async (ctx) => {
    const member = await currentMember(ctx);
    if (!member) return null;

    const stats = await ctx.db
      .query("dashboardStats")
      .withIndex("by_org", (q) => q.eq("organizationId", member.organizationId))
      .first();

    return (
      stats ?? {
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalBounced: 0,
        totalComplaints: 0,
        updatedAt: Date.now(),
      }
    );
  },
});

const STAT_FIELDS = {
  sent: "totalSent",
  delivered: "totalDelivered",
  opened: "totalOpened",
  clicked: "totalClicked",
  bounced: "totalBounced",
  complained: "totalComplaints",
} as const;

export const updateStats = mutation({
  args: {
    organizationId: v.string(),
    event: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("complained")
    ),
  },
  handler: async (ctx, args) => {
    await requireServer(ctx);

    const existing = await ctx.db
      .query("dashboardStats")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const field = STAT_FIELDS[args.event];

    if (existing) {
      await ctx.db.patch("dashboardStats", existing._id, {
        [field]: existing[field] + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("dashboardStats", {
        organizationId: args.organizationId,
        totalSent: args.event === "sent" ? 1 : 0,
        totalDelivered: args.event === "delivered" ? 1 : 0,
        totalOpened: args.event === "opened" ? 1 : 0,
        totalClicked: args.event === "clicked" ? 1 : 0,
        totalBounced: args.event === "bounced" ? 1 : 0,
        totalComplaints: args.event === "complained" ? 1 : 0,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getCampaignProgress = query({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => {
    const member = await currentMember(ctx);
    if (!member) return null;

    const progress = await ctx.db
      .query("campaignProgress")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();
    return progress?.organizationId === member.organizationId ? progress : null;
  },
});

export const getActivityFeed = query({
  args: {
    organizationId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const member = await currentMember(ctx);
    if (!member) return [];

    return await ctx.db
      .query("activityFeed")
      .withIndex("by_org", (q) => q.eq("organizationId", member.organizationId))
      .order("desc")
      .take(clampLimit(args.limit, 30));
  },
});

export const logActivity = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    userName: v.string(),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    resourceName: v.string(),
  },
  handler: async (ctx, args) => {
    await requireServer(ctx);

    return await ctx.db.insert("activityFeed", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
