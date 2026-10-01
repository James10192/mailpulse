import type { Auth } from "convex/server";
import { CONVEX_ROLE_MEMBER, CONVEX_ROLE_SERVER, CONVEX_TOKEN_ISSUER } from "./authIdentity";

/**
 * Every Convex function is public: anyone who knows the deployment URL can
 * call it. Identity therefore never comes from the arguments, only from the
 * token MailPulse signed (see src/lib/convex-auth.ts).
 */
export type Member = {
  userId: string;
  organizationId: string;
  name: string;
};

async function identityOf(ctx: { auth: Auth }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || identity.issuer !== CONVEX_TOKEN_ISSUER) return null;
  return identity;
}

/** The signed-in member, or null: queries answer empty rather than throw. */
export async function currentMember(ctx: { auth: Auth }): Promise<Member | null> {
  const identity = await identityOf(ctx);
  if (!identity || identity.role !== CONVEX_ROLE_MEMBER) return null;
  const organizationId = identity.org;
  if (typeof organizationId !== "string" || organizationId === "") return null;
  return {
    userId: identity.subject,
    organizationId,
    name: typeof identity.name === "string" && identity.name ? identity.name : identity.subject,
  };
}

export async function requireMember(ctx: { auth: Auth }): Promise<Member> {
  const member = await currentMember(ctx);
  if (!member) throw new Error("Authentification requise");
  return member;
}

/** Writes that only the MailPulse server makes: stats, activity, notifications, message mirror. */
export async function requireServer(ctx: { auth: Auth }): Promise<void> {
  const identity = await identityOf(ctx);
  if (!identity || identity.role !== CONVEX_ROLE_SERVER) throw new Error("Accès refusé");
}

export const MAX_LIST_LIMIT = 50;

export function clampLimit(limit: number | undefined, fallback: number): number {
  if (limit === undefined || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT);
}
