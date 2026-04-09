import { GenericQueryCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";

/**
 * Verify an organization has been seen before (has dashboardStats or activity).
 * Throws if unknown — prevents arbitrary writes from unauthenticated clients.
 */
export async function assertOrgExists(ctx: GenericQueryCtx<DataModel>, organizationId: string) {
  const stats = await ctx.db
    .query("dashboardStats")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .first();
  if (stats) return;

  const activity = await ctx.db
    .query("activityFeed")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .first();
  if (activity) return;

  throw new Error("Unknown organization");
}
