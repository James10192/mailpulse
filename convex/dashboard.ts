import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { assertOrgExists } from "./lib";

export const getStats = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("dashboardStats")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
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
    const existing = await ctx.db
      .query("dashboardStats")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .first();

    const fieldMap: Record<string, string> = {
      sent: "totalSent",
      delivered: "totalDelivered",
      opened: "totalOpened",
      clicked: "totalClicked",
      bounced: "totalBounced",
      complained: "totalComplaints",
    };

    const field = fieldMap[args.event];

    if (existing) {
      await ctx.db.patch(existing._id, {
        [field]: (existing[field as keyof typeof existing] as number) + 1,
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
    return await ctx.db
      .query("campaignProgress")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .first();
  },
});

export const getActivityFeed = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activityFeed")
      .withIndex("by_org", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(args.limit ?? 30);
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
    await assertOrgExists(ctx, args.organizationId);

    return await ctx.db.insert("activityFeed", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
