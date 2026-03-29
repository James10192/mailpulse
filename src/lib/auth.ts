import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { organization } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { passkey } from "@better-auth/passkey";
import { prisma } from "./prisma";

function extractRpID(url?: string): string {
  if (!url) return "localhost";
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/\.$/, ""); // Remove trailing dot if any
  } catch {
    return url.replace("https://", "").replace("http://", "").split(":")[0].split("/")[0].replace(/\.$/, "");
  }
}

const rpID = extractRpID(process.env.BETTER_AUTH_URL);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    "https://mailpulse-two.vercel.app",
    "http://localhost:3000",
  ],

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
    },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
    dash(),
    passkey({
      rpID,
      rpName: "MailPulse",
      origin: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
