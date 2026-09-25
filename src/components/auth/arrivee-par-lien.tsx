"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { nettoyerCode, LONGUEUR_CODE } from "./cases-code";
import { ConnexionEmail } from "./connexion-email";

/**
 * Reads `#email=…&code=…` from the email link, then wipes it from the address
 * bar and history: the code must not linger in the tab or a shared screenshot.
 * The fragment never reached the server.
 */
export function ArriveeParLien() {
  const [lu, setLu] = useState<{ email: string; code: string } | null | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const email = params.get("email") ?? "";
    const code = nettoyerCode(params.get("code") ?? "");
    window.history.replaceState(null, "", window.location.pathname);
    // Read once, after mount: the fragment only exists in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLu(email && code.length === LONGUEUR_CODE ? { email, code } : null);
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

  return <ConnexionEmail destination="/dashboard" emailInitial={lu.email} codeInitial={lu.code} />;
}
