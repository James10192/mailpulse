import type { Metadata } from "next";

import { EcranAuth } from "@/components/auth/ecran-auth";
import { ArriveeParLien } from "@/components/auth/arrivee-par-lien";

export const metadata: Metadata = {
  title: "Confirmer la connexion",
  robots: { index: false },
};

/** Landing page of the email link. The code travels in the URL fragment. */
export default function VerifierPage() {
  return (
    <EcranAuth>
      <ArriveeParLien />
    </EcranAuth>
  );
}
