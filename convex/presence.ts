import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { currentMember, requireMember } from "./lib";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const MAX_PAGE_LENGTH = 300;

export const heartbeat = mutation({
  args: {
    currentPage: v.string(),
    // Still accepted, and ignored: identity comes from the token. Kept so that
    // a tab opened before this version does not fail validation.
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await requireMember(ctx);
    const state = {
      userId: member.userId,
      userName: member.name,
      organizationId: member.organizationId,
      currentPage: args.currentPage.slice(0, MAX_PAGE_LENGTH),
      lastSeenAt: Date.now(),
    };

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("userId", member.userId))
      .first();

    if (existing) {
      await ctx.db.replace("presence", existing._id, state);
    } else {
      await ctx.db.insert("presence", state);
    }
  },
});

export const getOnlineUsers = query({
  args: { organizationId: v.optional(v.string()) },
  handler: async (ctx) => {
    const member = await currentMember(ctx);
    if (!member) return [];

    const since = Date.now() - ONLINE_WINDOW_MS;
    const users = await ctx.db
      .query("presence")
      .withIndex("by_org", (q) => q.eq("organizationId", member.organizationId).gte("lastSeenAt", since))
      .collect();

    return users.map((user) => ({
      userId: user.userId,
      userName: user.userName,
      currentPage: user.currentPage,
      lastSeenAt: user.lastSeenAt,
    }));
  },
});
