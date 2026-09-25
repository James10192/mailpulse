import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ConnexionEmail } from "@/components/auth/connexion-email";
import { EcranAuth } from "@/components/auth/ecran-auth";
import { auth } from "@/lib/auth";
import { destinationSure } from "@/lib/auth-destination";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connexion ou création de compte MailPulse, sans mot de passe.",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const destination = destinationSure(params.callbackUrl ?? params.next);

  // Already signed in: straight to where they were going.
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (session) redirect(destination);

  return (
    <EcranAuth>
      <ConnexionEmail destination={destination} />
    </EcranAuth>
  );
}
