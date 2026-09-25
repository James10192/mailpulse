"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { destinationSure } from "@/lib/auth-destination";

import { nettoyerCode, LONGUEUR_CODE } from "./cases-code";
import { ConnexionEmail } from "./connexion-email";
import { demandeEnCours } from "./demande-connexion";

type Lu = { email: string; code: string; destination: string | null };

/**
 * Reads `#email=…&code=…` from the email link, then wipes it from the address
 * bar and history: the code must not linger in the tab or a shared screenshot.
 * The fragment never reached the server.
 */
export function ArriveeParLien() {
  const [lu, setLu] = useState<Lu | null | undefined>(undefined);
  // The fragment is wiped on first read. Keep what was read so a second run of
  // the effect (React StrictMode in development) does not see an empty hash.
  const lecture = useRef<Lu | null | undefined>(undefined);

  useEffect(() => {
    if (lecture.current === undefined) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const email = params.get("email") ?? "";
      const code = nettoyerCode(params.get("code") ?? "");
      window.history.replaceState(null, "", window.location.pathname);
      lecture.current = email && code.length === LONGUEUR_CODE
        ? { email, code, destination: demandeEnCours(email)?.destination ?? null }
        : null;
    }
    // Read once, after mount: the fragment only exists in the browser.
    setLu(lecture.current);
  }, []);

  if (lu === undefined) return <div className="min-h-[320px]" aria-busy="true" />;

  if (lu === null) {
    return (
      <div>
        <h1 className="text-balance text-[28px] font-semibold leading-tight tracking-[-0.03em] text-zinc-50">Ce lien n&apos;est plus valable</h1>
        <p className="mt-2 text-pretty text-[15px] leading-relaxed text-zinc-400">
          Il est incomplet ou a déjà servi. Pour votre sécurité, chaque lien ne fonctionne qu&apos;une fois.
        </p>
        <Link
          href="/login"
          className="mt-8 flex h-12 w-full items-center justify-center rounded-[10px] bg-orange-500 text-[15px] font-semibold text-zinc-950 hover:bg-orange-400"
        >
          Recevoir un nouveau lien
        </Link>
      </div>
    );
  }

  // Same browser that asked for the code: one tap, back to where the visitor
  // was going. Any other browser: the code must be typed, see
  // demande-connexion.ts.
  if (lu.destination) {
    return <ConnexionEmail destination={destinationSure(lu.destination)} emailInitial={lu.email} codeInitial={lu.code} />;
  }

  return <ConnexionEmail destination="/dashboard" emailInitial={lu.email} saisieDepuisLien />;
}
