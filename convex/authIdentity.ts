// Shared by the Next.js side, which signs the tokens, and by Convex, which
// checks them. Constants only: nothing here may import Convex server code.

/** `iss` of every token MailPulse signs for Convex. */
export const CONVEX_TOKEN_ISSUER = "https://mailpulse.convex-auth";

/** `aud` of those tokens; Convex rejects any other audience. */
export const CONVEX_TOKEN_AUDIENCE = "mailpulse-convex";

/** Who a token speaks for. */
export const CONVEX_ROLE_MEMBER = "member";
export const CONVEX_ROLE_SERVER = "server";
