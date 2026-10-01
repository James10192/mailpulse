import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireServer } from "./lib";

const channelValidator = v.union(v.literal("email"), v.literal("whatsapp"), v.literal("sms"));
// Every Prisma MessageStatus, lowercased: a status missing here made Convex
// refuse the update, and the live mirror silently fell behind.
export const liveMessageStatus = v.union(
  v.literal("queued"),
  v.literal("processing"),
  v.literal("retrying"),
  v.literal("submission_unknown"),
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("read"),
  v.literal("failed"),
  v.literal("cancelled"),
  v.literal("reconciled"),
  v.literal("duplicate_confirmed"),
  v.literal("template_required")
);

// The live mirror keeps a message's state, never its recipient. Only the
// MailPulse server writes it.
export const upsertMessage = mutation({
  args: {
    organizationId: v.string(),
    messageId: v.string(),
    channel: channelValidator,
    status: liveMessageStatus,
    // Still accepted, and ignored, so that a deployment that sends it keeps working.
    recipient: v.optional(v.string()),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireServer(ctx);

    const existing = await ctx.db
      .query("liveMessages")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .unique();

    const state = {
      organizationId: args.organizationId,
      messageId: args.messageId,
      channel: args.channel,
      status: args.status,
      updatedAt: args.updatedAt,
    };

    if (existing) {
      await ctx.db.replace("liveMessages", existing._id, state);
      return existing._id;
    }

    return await ctx.db.insert("liveMessages", state);
  },
});

/**
 * Removes the recipients stored before the mirror stopped keeping them, a
 * page at a time; schedules itself until the table is clean. Run once:
 * `npx convex run communication:clearLiveMessageRecipients --prod`.
 */
export const clearLiveMessageRecipients = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.object({ cleared: v.number(), done: v.boolean() }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("liveMessages").paginate({ numItems: 200, cursor: args.cursor ?? null });
    let cleared = 0;
    for (const doc of page.page) {
      if (doc.recipient === undefined) continue;
      await ctx.db.patch("liveMessages", doc._id, { recipient: undefined });
      cleared += 1;
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.communication.clearLiveMessageRecipients, { cursor: page.continueCursor });
    }
    return { cleared, done: page.isDone };
  },
});
