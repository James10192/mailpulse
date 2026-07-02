import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const channelValidator = v.union(v.literal("email"), v.literal("whatsapp"), v.literal("sms"));
const statusValidator = v.union(
  v.literal("queued"),
  v.literal("retrying"),
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("read"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("template_required")
);

export const upsertMessage = mutation({
  args: {
    organizationId: v.string(),
    messageId: v.string(),
    channel: channelValidator,
    status: statusValidator,
    recipient: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("liveMessages")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        channel: args.channel,
        status: args.status,
        recipient: args.recipient,
        updatedAt: args.updatedAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("liveMessages", args);
  },
});

export const listRecent = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("liveMessages")
      .withIndex("by_organizationId_and_updatedAt", (q) => q.eq("organizationId", args.organizationId))
      .order("desc")
      .take(args.limit ?? 30);
  },
});
