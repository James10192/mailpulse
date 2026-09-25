import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { emailOTP, organization } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { passkey } from "@better-auth/passkey";
import { prisma } from "./prisma";
import { sendEmail } from "./resend";
import { CONNEXION_CODE_TTL_SECONDS, courrielConnexion, lienConnexion } from "./email/connexion";

const BASE_URL = (process.env.BETTER_AUTH_URL || "http://localhost:3000").trim();

const rpID = (() => {
  try { return new URL(BASE_URL).hostname; }
  catch { return "localhost"; }
})();

export const auth = betterAuth({
  baseURL: BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    BASE_URL,
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
    // Passwordless: one screen for sign-in and sign-up. The email carries a
    // 6-digit code and a link that fills it in (see src/lib/email/connexion.ts).
    // Sign-in with an unknown address creates the account.
    emailOTP({
      otpLength: 6,
      expiresIn: CONNEXION_CODE_TTL_SECONDS,
      allowedAttempts: 5,
      storeOTP: "hashed",
      rateLimit: { window: 60, max: 3 },
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") return;
        const message = courrielConnexion({ email, code: otp, lien: lienConnexion(BASE_URL, email, otp) });
        // Local development without a Resend key: print the email instead of
        // failing. Never in production, where a missing key must surface.
        if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production") {
          console.info(`[auth] Connexion ${email} : ${otp} · ${lienConnexion(BASE_URL, email, otp)}`);
          return;
        }
        await sendEmail({
          to: email,
          subject: message.subject,
          html: message.html,
          text: message.text,
          tags: [{ name: "category", value: "auth_sign_in" }],
        });
      },
    }),
    passkey({
      rpID,
      rpName: "MailPulse",
      origin: BASE_URL,
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
