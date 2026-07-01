import { ConvexHttpClient } from "convex/browser";

function createConvexServerClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required to call Convex.");
  }
  return new ConvexHttpClient(convexUrl);
}

let client: ConvexHttpClient | null = null;

function getConvexServerClient() {
  client ??= createConvexServerClient();
  return client;
}

export const convexServer = new Proxy({} as ConvexHttpClient, {
  get(_target, property) {
    return Reflect.get(getConvexServerClient(), property);
  },
});
