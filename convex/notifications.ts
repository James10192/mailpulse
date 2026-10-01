import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { clampLimit, currentMember, requireMember, requireServer } from "./lib";

// `userId` arguments are still accepted, and ignored, so that a tab opened
// before this version keeps rendering. The user always comes from the token.

export const list = query({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const member = await currentMember(ctx);
    if (!member) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", member.userId))
      .order("desc")
      .take(clampLimit(args.limit, 20));
  },
});

export const unreadCount = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx) => {
    const member = await currentMember(ctx);
    if (!member) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", member.userId).eq("read", false))
      .collect();
    return unread.length;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx);
    const notification = await ctx.db.get("notifications", args.notificationId);
    // Same answer for « absent » and « someone else's »: ids are not probed.
    if (!notification || notification.userId !== member.userId) return;
    await ctx.db.patch("notifications", args.notificationId, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx) => {
    const member = await requireMember(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", member.userId).eq("read", false))
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch("notifications", n._id, { read: true })));
  },
});

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    await requireServer(ctx);

    return await ctx.db.insert("notifications", {
      ...args,
      read: false,
      createdAt: Date.now(),
    });
  },
});
