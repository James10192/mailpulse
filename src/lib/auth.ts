import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { emailOTP, organization } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { passkey } from "@better-auth/passkey";
import { prisma } from "./prisma";
import { sendEmail } from "./resend";
import { CONNEXION_CODE_TTL_SECONDS, courrielConnexion, lienConnexion } from "./email/connexion";

// Sign-in links are built from this: in production without BETTER_AUTH_URL
// they must not point to localhost.
const BASE_URL = (
  process.env.BETTER_AUTH_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).trim();

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

  // Passwordless only. Leaving password sign-up open let anyone register a
  // victim's address with a password first: the victim's later code sign-in
  // would land in that account and the attacker's password would keep working.
  emailAndPassword: {
    enabled: false,
  },

  // Counters in the database, not in memory: on serverless each instance
  // would otherwise count on its own. A storage failure (table not migrated
  // yet, database blip) must never block sign-in: it lets the request through
  // and logs.
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    customStorage: {
      async get(key) {
        try {
          const ligne = await prisma.rateLimit.findUnique({ where: { key } });
          return ligne ? { key: ligne.key, count: ligne.count, lastRequest: Number(ligne.lastRequest) } : null;
        } catch (erreur) {
          console.error("[auth] rate limit indisponible (lecture)", erreur);
          return null;
        }
      },
      async set(key, valeur) {
        try {
          await prisma.rateLimit.upsert({
            where: { key },
            create: { key, count: valeur.count, lastRequest: BigInt(valeur.lastRequest) },
            update: { count: valeur.count, lastRequest: BigInt(valeur.lastRequest) },
          });
        } catch (erreur) {
          console.error("[auth] rate limit indisponible (écriture)", erreur);
        }
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/email-otp/send-verification-otp") return;
      const email = String(ctx.body?.email ?? "").trim().toLowerCase();
      if (email && !(await autoriserEnvoiCode(email))) {
        throw new APIError("TOO_MANY_REQUESTS", {
          message: "Trop de codes demandés pour cette adresse. Réessayez dans une heure.",
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/email-otp/send-verification-otp") return;
      const email = String(ctx.body?.email ?? "").trim().toLowerCase();
      if (envoisEchoues.delete(email)) {
        throw new APIError("BAD_GATEWAY", {
          code: "EMAIL_SEND_FAILED",
          message: "L'e-mail n'a pas pu partir. Réessayez dans un instant.",
        });
      }
    }),
  },

  databaseHooks: {
    user: {
      create: {
        // Code sign-in creates the account with an empty name. Give it the
        // part before the @ so every screen and the activity feed have one.
        before: async (user) => ({
          data: { ...user, name: user.name?.trim() || user.email.split("@")[0] },
        }),
      },
    },
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
      // Google only: GitHub can return an unverified primary email, and a
      // trusted provider links without checking it.
      trustedProviders: ["google"],
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
      // Per IP; several people behind one carrier or office IP share it.
      rateLimit: { window: 60, max: 5 },
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") return;
        const message = courrielConnexion({ email, code: otp, lien: lienConnexion(BASE_URL, email, otp), baseUrl: BASE_URL });
        // Local development without a Resend key: print the email instead of
        // failing. Never in production, where a missing key must surface.
        if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production") {
          console.info(`[auth] Connexion ${email} : ${otp} · ${lienConnexion(BASE_URL, email, otp)}`);
          return;
        }
        try {
          await sendEmail({
            to: email,
            subject: message.subject,
            html: message.html,
            text: message.text,
            tags: [{ name: "category", value: "auth_sign_in" }],
          });
        } catch (erreur) {
          // Better Auth swallows errors thrown here and answers « sent ».
          // Remember the failure so the after hook can report it.
          envoisEchoues.add(email.toLowerCase());
          console.error("[auth] envoi du code de connexion impossible", erreur);
        }
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

/** Addresses whose sign-in email failed during the current request. */
const envoisEchoues = new Set<string>();

const CODES_PAR_ADRESSE = 5;
const FENETRE_ADRESSE_MS = 60 * 60 * 1000;

/**
 * Per-address cap on sign-in codes, whatever the IP: stops an inbox from
 * being flooded, and stops fresh codes from locking someone out by replacing
 * theirs over and over.
 */
async function autoriserEnvoiCode(email: string): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;
  try {
    return await compterEnvoiCode(`otp-email:${email}`);
  } catch (erreur) {
    console.error("[auth] plafond par adresse indisponible", erreur);
    return true;
  }
}

async function compterEnvoiCode(key: string): Promise<boolean> {
  const now = Date.now();
  const courant = await prisma.rateLimit.findUnique({ where: { key } });

  if (!courant || now - Number(courant.lastRequest) > FENETRE_ADRESSE_MS) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, lastRequest: BigInt(now) },
      update: { count: 1, lastRequest: BigInt(now) },
    });
    return true;
  }
  if (courant.count >= CODES_PAR_ADRESSE) return false;
  await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  return true;
}
