import { ConvexHttpClient } from "convex/browser";
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { signServerToken, type ConvexToken } from "@/lib/convex-auth";

/** Renew this long before the token expires, so no call goes out with a stale one. */
const RENEW_BEFORE_MS = 60_000;

let client: ConvexHttpClient | null = null;
let serverToken: Promise<ConvexToken> | null = null;
let serverTokenExpiresAt = 0;

function getClient() {
  if (client) return client;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is required to call Convex.");
  client = new ConvexHttpClient(convexUrl);
  return client;
}

async function authenticatedClient() {
  const convex = getClient();
  if (!serverToken || serverTokenExpiresAt - RENEW_BEFORE_MS <= Date.now()) {
    serverTokenExpiresAt = Number.POSITIVE_INFINITY;
    serverToken = signServerToken().then(
      (signed) => {
        serverTokenExpiresAt = signed.expiresAt;
        convex.setAuth(signed.token);
        return signed;
      },
      (error) => {
        serverToken = null;
        serverTokenExpiresAt = 0;
        throw error;
      },
    );
  }
  await serverToken;
  return convex;
}

/**
 * Convex as the MailPulse server: every call carries a server token, which the
 * write functions require. Never use a bare ConvexHttpClient for writes.
 */
export const convexServer = {
  async mutation<M extends FunctionReference<"mutation">>(fn: M, args: FunctionArgs<M>): Promise<FunctionReturnType<M>> {
    const convex = await authenticatedClient();
    return convex.mutation(fn, args);
  },
  async query<Q extends FunctionReference<"query">>(fn: Q, args: FunctionArgs<Q>): Promise<FunctionReturnType<Q>> {
    const convex = await authenticatedClient();
    return convex.query(fn, args);
  },
};

/**
 * Records an entry in the live activity feed. Never blocks nor fails the
 * action it describes: the feed is a mirror, Prisma stays authoritative.
 */
export function logActivity(args: FunctionArgs<typeof api.dashboard.logActivity>) {
  void convexServer.mutation(api.dashboard.logActivity, args).catch((error: unknown) => {
    console.error("[convex] activité non enregistrée", { resourceType: args.resourceType, error: String(error) });
  });
}
