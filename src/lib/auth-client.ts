import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import { sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
  plugins: [
    organizationClient(),
    sentinelClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  useActiveOrganization,
} = authClient;
