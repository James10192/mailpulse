import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const heartbeat = mutation({
  args: {
    userId: v.string(),
    userName: v.string(),
    organizationId: v.string(),
    currentPage: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentPage: args.currentPage,
        lastSeenAt: Date.now(),
      });
    } else {
      await ctx.db.insert("presence", {
        ...args,
        lastSeenAt: Date.now(),
      });
    }
  },
});

export const getOnlineUsers = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const users = await ctx.db
      .query("presence")
      .withIndex("by_org", (q) =>
        q.eq("organizationId", args.organizationId).gte("lastSeenAt", fiveMinutesAgo)
      )
      .collect();

    return users;
  },
});
