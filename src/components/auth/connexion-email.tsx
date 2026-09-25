"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, Mail } from "lucide-react";
import { usePostHog } from "posthog-js/react";

import { EVENTS } from "@/lib/analytics-events";
import { authClient, signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import { CasesCode, LONGUEUR_CODE } from "./cases-code";

const DELAI_RENVOI_S = 45;

type Etape = "email" | "code";
type EtatCode = "normal" | "verification" | "erreur" | "succes";
type Fournisseur = "google" | "github";

const FAUTES_DOMAINE: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmal.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "yahoo.co": "yahoo.com",
  "yaho.fr": "yahoo.fr",
  "outlok.com": "outlook.com",
};

function suggestion(email: string): string | null {
  const [local, domaine] = email.trim().toLowerCase().split("@");
  if (!local || !domaine) return null;
  const correct = FAUTES_DOMAINE[domaine];

  return correct ? `${local}@${correct}` : null;
}

function emailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function messageries(email: string): { libelle: string; url: string }[] {
  const domaine = email.split("@")[1]?.toLowerCase() ?? "";
  const gmail = { libelle: "Ouvrir Gmail", url: "https://mail.google.com/mail/u/0/#search/from%3Amailpulse+newer_than%3A1h" };
  const outlook = { libelle: "Ouvrir Outlook", url: "https://outlook.live.com/mail/0/" };
  const yahoo = { libelle: "Ouvrir Yahoo Mail", url: "https://mail.yahoo.com/" };

  if (domaine === "gmail.com" || domaine === "googlemail.com") return [gmail];
  if (/^(outlook|hotmail|live|msn)\./.test(domaine)) return [outlook];
  if (domaine.startsWith("yahoo.")) return [yahoo];

  return [gmail, outlook];
}

/**
 * One screen for signing in and signing up: an email address, then a 6-digit
 * code. The same email carries a link that opens this screen with the code
 * already filled in (`codeInitial`); the visitor still confirms with a tap, so
 * a mail scanner that pre-opens links cannot use it up.
 */
export function ConnexionEmail({
  destination,
  emailInitial = "",
  codeInitial = "",
}: {
  destination: string;
  emailInitial?: string;
  codeInitial?: string;
}) {
  const router = useRouter();
  const posthog = usePostHog();
  const reduit = useReducedMotion();
  const id = useId();
  const arriveeParLien = codeInitial.length === LONGUEUR_CODE && emailValide(emailInitial);

  const [etape, setEtape] = useState<Etape>(arriveeParLien ? "code" : "email");
  const [email, setEmail] = useState(emailInitial);
  const [emailTouche, setEmailTouche] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [code, setCode] = useState(arriveeParLien ? codeInitial : "");
  const [etatCode, setEtatCode] = useState<EtatCode>("normal");
  const [secousse, setSecousse] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(arriveeParLien ? "Code reconnu depuis votre e-mail. Confirmez pour vous connecter." : null);
  const [codeEpuise, setCodeEpuise] = useState(false);
  const [attente, setAttente] = useState(arriveeParLien ? 0 : DELAI_RENVOI_S);
  const [fournisseur, setFournisseur] = useState<Fournisseur | null>(null);

  const titre = useRef<HTMLHeadingElement>(null);
  const champEmail = useRef<HTMLInputElement>(null);
  const champCode = useRef<HTMLInputElement>(null);
  const enVol = useRef(false);

  // Focus follows the step, so screen readers announce the new title.
  useEffect(() => {
    titre.current?.focus({ preventScroll: true });
  }, [etape]);

  useEffect(() => {
    // No autofocus on touch screens: the keyboard would hide the page.
    if (etape === "email" && window.matchMedia("(pointer: fine)").matches) champEmail.current?.focus();
    if (etape === "code" && !arriveeParLien) champCode.current?.focus();
  }, [etape, arriveeParLien]);

  useEffect(() => {
    if (etape !== "code" || attente <= 0) return;
    const minuteur = window.setTimeout(() => setAttente((s) => s - 1), 1000);

    return () => window.clearTimeout(minuteur);
  }, [etape, attente]);

  async function envoyerCode(renvoi = false) {
    if (envoi) return;
    if (!emailValide(email)) {
      setEmailTouche(true);
      champEmail.current?.focus();
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim().toLowerCase(), type: "sign-in" });
      if (error) {
        setErreur(error.status === 429
          ? "Vous avez demandé beaucoup de codes. Patientez une minute avant de réessayer."
          : "L'envoi du code a échoué. Réessayez dans un instant.");
        return;
      }
      setCode("");
      setEtatCode("normal");
      setCodeEpuise(false);
      setAttente(DELAI_RENVOI_S);
      setInfo(renvoi ? "Nouveau code envoyé. L'ancien ne fonctionne plus." : null);
      setEtape("code");
    } catch {
      setErreur("Connexion interrompue. Vérifiez votre réseau puis réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  const verifier = useCallback(async (saisi: string) => {
    if (enVol.current || saisi.length !== LONGUEUR_CODE) return;
    enVol.current = true;
    setEtatCode("verification");
    setErreur(null);
    try {
      const { error } = await signIn.emailOtp({ email: email.trim().toLowerCase(), otp: saisi });
      if (!error) {
        setEtatCode("succes");
        setInfo("C'est bon. On vous connecte…");
        posthog?.capture(EVENTS.USER_LOGGED_IN, { method: "email_otp" });
        router.replace(destination);
        router.refresh();
        return;
      }
      posthog?.capture(EVENTS.LOGIN_FAILED, { method: "email_otp", code: error.code });
      enVol.current = false;
      setCode("");
      setEtatCode("erreur");
      setSecousse((s) => s + 1);
      setInfo(null);
      if (error.code === "OTP_EXPIRED") {
        setCodeEpuise(true);
        setErreur("Ce code a expiré. Nous pouvons vous en envoyer un nouveau.");
      } else if (error.code === "TOO_MANY_ATTEMPTS") {
        setCodeEpuise(true);
        setErreur("Trop d'essais. Demandez un nouveau code pour continuer.");
      } else if (error.status === 429) {
        setErreur("Trop de tentatives rapprochées. Patientez une minute.");
      } else {
        setErreur("Ce code ne correspond pas. Vérifiez le dernier e-mail reçu.");
      }
      champCode.current?.focus();
    } catch {
      enVol.current = false;
      setEtatCode("normal");
      setErreur("Connexion interrompue. Vérifiez votre réseau puis réessayez.");
    }
  }, [destination, email, posthog, router]);

  function saisirCode(valeur: string) {
    setCode(valeur);
    if (etatCode === "erreur") setEtatCode("normal");
    // Auto-submit on the sixth digit, except when arriving by the link: the
    // tap on « Me connecter » is what proves a human opened it.
    if (valeur.length === LONGUEUR_CODE && !arriveeParLien) void verifier(valeur);
  }

  async function oauth(fournisseurChoisi: Fournisseur) {
    setFournisseur(fournisseurChoisi);
    setErreur(null);
    try {
      const { error } = await signIn.social({ provider: fournisseurChoisi, callbackURL: destination });
      if (error) throw new Error(error.message);
    } catch {
      setFournisseur(null);
      setErreur(`La connexion avec ${fournisseurChoisi === "google" ? "Google" : "GitHub"} n'a pas abouti. Réessayez ou utilisez votre e-mail.`);
    }
  }

  const emailInvalide = emailTouche && email.trim() !== "" && !emailValide(email);
  const proposition = suggestion(email);
  const transition = reduit ? { duration: 0 } : { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {etape === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: reduit ? 0 : -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduit ? 0 : -16 }}
            transition={transition}
          >
            <h1 ref={titre} tabIndex={-1} className="text-balance text-[28px] font-semibold leading-tight tracking-[-0.03em] text-zinc-50 outline-none">
              Continuer avec votre e-mail
            </h1>
            <p className="mt-2 text-pretty text-[15px] leading-relaxed text-zinc-400">
              Connexion ou création de compte : on vous envoie un code, pas de mot de passe.
            </p>

            <form
              className="mt-8"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void envoyerCode();
              }}
            >
              <label htmlFor={`${id}-email`} className="text-sm font-medium text-zinc-200">
                Adresse e-mail
              </label>
              <input
                ref={champEmail}
                id={`${id}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="vous@entreprise.com"
                value={email}
                readOnly={envoi}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouche(true)}
                aria-invalid={emailInvalide}
                aria-describedby={emailInvalide || proposition ? `${id}-email-aide` : undefined}
                className={cn(
                  "mt-2 h-12 w-full rounded-[10px] border bg-zinc-900 px-4 text-base text-zinc-50 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-zinc-600",
                  "border-white/[0.08] hover:border-white/[0.14] focus:border-orange-500 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.18)]",
                  emailInvalide && "border-red-400/70",
                )}
              />
              <div id={`${id}-email-aide`} className="min-h-[24px] pt-1.5 text-[13px]">
                {proposition ? (
                  <button type="button" onClick={() => setEmail(proposition)} className="text-zinc-400 hover:text-zinc-200">
                    Vouliez-vous dire <span className="font-medium text-orange-400 underline underline-offset-2">{proposition}</span> ?
                  </button>
                ) : emailInvalide ? (
                  <span className="text-red-400">Cette adresse ne semble pas complète.</span>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={envoi}
                aria-busy={envoi}
                className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-orange-500 px-5 text-[15px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(249,115,22,.4),0_8px_24px_-8px_rgba(249,115,22,.5)] transition-[background-color,transform] duration-200 hover:bg-orange-400 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
              >
                {envoi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Envoi du code…
                  </>
                ) : (
                  <>
                    Recevoir un code
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <Alerte message={erreur} />

            <div className="my-7 flex items-center gap-3 text-xs text-zinc-500" aria-hidden="true">
              <span className="h-px flex-1 bg-white/[0.08]" />
              ou
              <span className="h-px flex-1 bg-white/[0.08]" />
            </div>

            <div className="grid gap-3">
              <BoutonFournisseur onClick={() => void oauth("google")} occupe={fournisseur === "google"} libelle="Google" icone={<IconeGoogle />} />
              <BoutonFournisseur onClick={() => void oauth("github")} occupe={fournisseur === "github"} libelle="GitHub" icone={<IconeGitHub />} />
            </div>

            <p className="mt-8 text-pretty text-xs leading-relaxed text-zinc-500">
              En continuant, vous acceptez les{" "}
              <Link href="/docs" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200">Conditions</Link> et la{" "}
              <Link href="/docs" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200">Politique de confidentialité</Link>.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, x: reduit ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduit ? 0 : 16 }}
            transition={transition}
          >
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900 text-orange-400" aria-hidden="true">
              <Mail className="h-5 w-5" />
            </div>
            <h1 ref={titre} tabIndex={-1} className="text-balance text-[28px] font-semibold leading-tight tracking-[-0.03em] text-zinc-50 outline-none">
              {etatCode === "succes" ? "C'est bon." : arriveeParLien ? "Confirmez votre connexion" : "Vérifiez votre boîte de réception"}
            </h1>
            <p className="mt-2 text-pretty text-[15px] leading-relaxed text-zinc-400">
              {arriveeParLien ? (
                <>Connexion à MailPulse avec <span className="font-medium text-zinc-200">{email}</span>.</>
              ) : (
                <>Nous avons envoyé un code à 6 chiffres à <span className="font-medium text-zinc-200">{email}</span>. Il expire dans 10 minutes.</>
              )}
            </p>
            {!arriveeParLien && (
              <button
                type="button"
                onClick={() => { setErreur(null); setInfo(null); setEtape("email"); }}
                className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Modifier l&apos;adresse
              </button>
            )}

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                void verifier(code);
              }}
            >
              <CasesCode
                ref={champCode}
                valeur={code}
                onChange={saisirCode}
                etat={etatCode}
                secousse={secousse}
                desactive={etatCode === "verification" || etatCode === "succes"}
                idDescription={`${id}-code-aide`}
              />
              <p id={`${id}-code-aide`} className="mt-4 text-[13px] text-zinc-500">
                {arriveeParLien ? "Le code vient du lien de votre e-mail." : "Ou cliquez sur le lien dans l'e-mail : le code se remplira tout seul."}
              </p>

              <button
                type="submit"
                disabled={code.length !== LONGUEUR_CODE || etatCode === "verification" || etatCode === "succes"}
                aria-busy={etatCode === "verification"}
                className={cn(
                  "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[10px] px-5 text-[15px] font-semibold transition-[background-color,opacity,transform] duration-200 active:scale-[0.98] disabled:cursor-not-allowed",
                  arriveeParLien
                    ? "bg-orange-500 text-zinc-950 hover:bg-orange-400 disabled:opacity-60"
                    : "border border-white/[0.1] bg-zinc-900 text-zinc-100 hover:border-white/[0.18] disabled:opacity-50",
                )}
              >
                {etatCode === "verification" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Vérification du code…
                  </>
                ) : arriveeParLien ? "Me connecter" : "Vérifier"}
              </button>
            </form>

            <p className="sr-only" role="status" aria-live="polite">
              {etatCode === "verification" ? "Vérification du code…" : info ?? ""}
            </p>
            {info && etatCode !== "verification" && (
              <p className="mt-4 text-sm text-zinc-300" aria-hidden="true">{info}</p>
            )}
            <Alerte message={erreur} />

            {codeEpuise ? (
              <button
                type="button"
                onClick={() => void envoyerCode(true)}
                disabled={envoi}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-orange-500 text-sm font-semibold text-zinc-950 hover:bg-orange-400 disabled:opacity-70"
              >
                {envoi && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Recevoir un nouveau code
              </button>
            ) : !arriveeParLien && etatCode !== "succes" ? (
              <>
                <div className="mt-6 flex flex-wrap gap-2">
                  {messageries(email).map((m) => (
                    <a
                      key={m.url}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-white/[0.08] px-4 text-sm text-zinc-300 transition-colors hover:border-white/[0.16] hover:text-zinc-50"
                    >
                      <Mail className="h-4 w-4 text-zinc-500" aria-hidden="true" /> {m.libelle}
                    </a>
                  ))}
                </div>
                <div className="mt-6 text-sm">
                  {attente > 0 ? (
                    <span className="text-zinc-500">
                      Renvoyer le code dans <span className="font-mono tabular-nums text-zinc-400">0:{String(attente).padStart(2, "0")}</span>
                    </span>
                  ) : (
                    <button type="button" onClick={() => void envoyerCode(true)} disabled={envoi} className="min-h-[44px] font-medium text-orange-400 hover:text-orange-300 disabled:opacity-60">
                      Renvoyer le code
                    </button>
                  )}
                </div>
                <p className="mt-6 text-pretty text-xs leading-relaxed text-zinc-500">
                  Rien reçu ? Regardez dans les courriers indésirables ou l&apos;onglet Promotions.
                </p>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Alerte({ message }: { message: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-4 rounded-[10px] border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function BoutonFournisseur({ onClick, occupe, libelle, icone }: { onClick: () => void; occupe: boolean; libelle: string; icone: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={occupe}
      aria-busy={occupe}
      className="flex h-12 items-center justify-center gap-2.5 rounded-[10px] border border-white/[0.08] bg-transparent px-4 text-sm font-medium text-zinc-200 transition-[border-color,background-color,transform] duration-200 hover:border-white/[0.16] hover:bg-white/[0.03] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
    >
      {occupe ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icone}
      {occupe ? `Redirection vers ${libelle}…` : `Continuer avec ${libelle}`}
    </button>
  );
}

function IconeGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function IconeGitHub() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
