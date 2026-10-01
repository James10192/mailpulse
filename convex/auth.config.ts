import type { AuthConfig } from "convex/server";
import { CONVEX_TOKEN_AUDIENCE, CONVEX_TOKEN_ISSUER } from "./authIdentity";

// The public half of the key MailPulse signs Convex tokens with, as a JWKS
// encoded in base64. Set on the deployment:
//   npx convex env set MAILPULSE_CONVEX_JWKS <base64>
// Inline rather than fetched, so tokens do not depend on which domain serves
// MailPulse, and previews share the production key without an extra route.
const jwks = process.env.MAILPULSE_CONVEX_JWKS;
if (!jwks) {
  throw new Error("MAILPULSE_CONVEX_JWKS is not set on this Convex deployment.");
}

export default {
  providers: [
    {
      type: "customJwt",
      applicationID: CONVEX_TOKEN_AUDIENCE,
      issuer: CONVEX_TOKEN_ISSUER,
      jwks: `data:text/plain;charset=utf-8;base64,${jwks}`,
      algorithm: "ES256",
    },
  ],
} satisfies AuthConfig;
