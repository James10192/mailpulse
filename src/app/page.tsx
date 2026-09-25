import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  KeyRound,
  Languages,
  Mail,
  MessageCircle,
  MessageSquareText,
  ShieldCheck,
  Terminal,
  Webhook,
} from "lucide-react";

import { PLAN_CATALOG, PLAN_LIMITS, type PlanTier } from "@/lib/plan-catalog";
import { cn } from "@/lib/utils";
import {
  AutomationMock,
  BentoCard,
  ChannelsMock,
  CodeMock,
  ContactsMock,
  TrackingMock,
} from "@/components/landing/bento";
import { CodeBlock } from "@/components/landing/code-block";
import { HeroConsole } from "@/components/landing/hero-console";
import { LandingCTATracker, PricingSectionTracker } from "@/components/landing/landing-tracker";
import { LiveAnalytics } from "@/components/landing/live-analytics";
import { LandingMotion } from "@/components/landing/motion-provider";
import { Logo, Navbar } from "@/components/landing/navbar";
import {
  Container,
  Eyebrow,
  H2,
  Lead,
  cardClass,
  ghostCta,
  primaryCta,
} from "@/components/landing/primitives";
import { Reveal, Stagger, StaggerItem } from "@/components/landing/reveal";
import { Story } from "@/components/landing/story";

function formatNumber(value: number) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const FREE_CONTACTS = formatNumber(PLAN_LIMITS.FREE.contacts);

/* ───────── Data ───────── */

const INFRA = [
  { Icon: Mail, label: "Envoi e-mail via Resend" },
  { Icon: MessageCircle, label: "WhatsApp Cloud API (Meta)" },
  { Icon: MessageSquareText, label: "SMS Orange" },
  { Icon: Webhook, label: "Webhooks signés HMAC SHA-256" },
  { Icon: KeyRound, label: "Clés d'API par organisation" },
  { Icon: ShieldCheck, label: "Désabonnement en un clic" },
  { Icon: Languages, label: "Interface et documentation en français" },
];

const PROBLEMS = [
  {
    title: "Vos canaux ne se parlent pas",
    text: "L'e-mail dans un outil, WhatsApp sur un téléphone, les SMS chez un prestataire. Personne ne sait qui a reçu quoi.",
    log: [
      ["email", "outil A · export CSV"],
      ["whatsapp", "téléphone de l'accueil"],
    ],
  },
  {
    title: "Vous payez en devises",
    text: "Des abonnements en dollars ou en euros, pensés pour d'autres marchés. MailPulse affiche ses prix en FCFA.",
    log: [
      ["plan", `Pro · ${formatNumber(PLAN_LIMITS.PRO.priceFCFA)} FCFA / mois`],
      ["devise", "XOF, sans conversion"],
    ],
  },
  {
    title: "Vous découvrez les échecs trop tard",
    text: "Un rebond, une plainte, un désabonnement : MailPulse reçoit l'événement du fournisseur et met le contact à jour tout seul.",
    log: [
      ["14:02:11", "rebond définitif"],
      ["→", "contact désabonné"],
    ],
  },
];

const DEV_POINTS = [
  "Clés d'API révocables, isolées par organisation",
  "Webhooks sortants signés en HMAC SHA-256",
  "Idempotence : un envoi rejoué ne part qu'une fois",
  "API de codes de vérification par WhatsApp",
];

const PLANS: {
  tier: PlanTier;
  name: string;
  desc: string;
  cta: string;
  href: string;
  highlighted: boolean;
}[] = [
  { tier: "FREE", name: PLAN_LIMITS.FREE.label, desc: "Pour démarrer", cta: "Commencer gratuitement", href: "/login", highlighted: false },
  { tier: "PRO", name: PLAN_LIMITS.PRO.label, desc: "Pour les équipes", cta: "Choisir Pro", href: "/login", highlighted: true },
  {
    tier: "ENTERPRISE",
    name: "Entreprise",
    desc: "Volumes, SLA et accompagnement",
    cta: "Parler à l'équipe",
    href: "/contact",
    highlighted: false,
  },
];

const FAQ = [
  {
    q: "Faut-il un numéro WhatsApp Business ?",
    a: "Deux options. L'API officielle de Meta (WhatsApp Cloud API), avec vos modèles approuvés, recommandée en production. Ou la connexion d'un numéro existant par QR code, pratique pour démarrer mais non officielle.",
  },
  {
    q: "Mes données sont-elles isolées des autres clients ?",
    a: "Oui. Chaque organisation a ses contacts, ses clés d'API, ses webhooks et ses journaux, sans partage avec les autres.",
  },
  {
    q: "Puis-je importer mes contacts existants ?",
    a: "Oui, par fichier CSV ou par l'API. Les numéros sont convertis au format international et les adresses déjà présentes ne sont pas dupliquées.",
  },
  {
    q: "Comment sont gérés les désabonnements ?",
    a: "En un clic, depuis la messagerie du destinataire ou depuis un lien dans l'e-mail. Le contact passe immédiatement en désabonné.",
  },
  {
    q: "Puis-je envoyer des codes de vérification ?",
    a: "Oui, par WhatsApp. MailPulse génère le code à 6 chiffres, l'envoie, gère l'expiration après 10 minutes et bloque après 5 essais. Votre application ne voit jamais le code.",
  },
  {
    q: "Que se passe-t-il si j'atteins une limite de mon plan ?",
    a: `Le plan ${PLAN_LIMITS.FREE.label} couvre ${FREE_CONTACTS} contacts et ${formatNumber(PLAN_LIMITS.FREE.emailsPerMonth)} e-mails par mois. Au-delà, rien n'est supprimé : vos données restent visibles et tout se réactive dès le passage au plan Pro.`,
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Les prix sont en FCFA. Le passage au plan Pro se règle en ligne depuis les paramètres de facturation de votre espace.",
  },
];

/* ───────── Page ───────── */

export default function LandingPage() {
  return (
    <LandingMotion>
      <div className="dark mp-landing relative flex min-h-screen flex-col overflow-x-clip bg-zinc-950 text-zinc-50 antialiased">
        <div aria-hidden className="mp-grain" />
        <Navbar />

        <main id="mp-main" className="flex-1">
          <Hero />
          <InfraStrip />
          <Problems />
          <Platform />
          <HowItWorks />
          <Developers />
          <Live />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>

        <Footer />
      </div>
    </LandingMotion>
  );
}

/* ───────── 2.2 Hero ───────── */

function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-12 md:pb-24 md:pt-20 lg:pb-32 lg:pt-24">
      <div aria-hidden className="mp-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[340px] h-[420px] w-[900px] max-w-[160vw] -translate-x-1/2 rounded-full bg-orange-500 opacity-[0.12] blur-[120px]"
      />

      <Container className="relative">
        <div className="md:mx-auto md:max-w-[820px] md:text-center">
          <Link
            href="/docs/whatsapp"
            className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-white/[0.08] bg-zinc-900/70 py-1 pl-1.5 pr-3 text-[13px] text-zinc-300 transition-colors hover:border-white/[0.16] hover:text-zinc-50"
          >
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-orange-300">
              Nouveau
            </span>
            <span className="truncate">WhatsApp et SMS dans le même flux</span>
            <ArrowRight aria-hidden className="size-3.5 shrink-0" />
          </Link>

          {/* Not animated on purpose: the h1 is the LCP element. */}
          <h1 className="mt-6 text-balance bg-gradient-to-b from-zinc-50 to-zinc-400 bg-clip-text text-[clamp(2.5rem,6vw+0.5rem,4.5rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-transparent">
            Chaque message part. Vous voyez où il arrive.
          </h1>
          <p className="mt-6 text-pretty text-[17px] leading-[1.5] tracking-[-0.01em] text-zinc-400 md:mx-auto md:max-w-[640px] md:text-xl">
            E-mail, WhatsApp et SMS depuis une seule plateforme. Campagnes, automatisations et codes de
            vérification, avec le suivi de chaque ouverture, chaque clic et chaque réponse, en direct.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:justify-center">
            <LandingCTATracker location="hero">
              <Link href="/login" className={cn(primaryCta, "w-full sm:w-auto")}>
                Commencer gratuitement
                <ArrowRight aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
            </LandingCTATracker>
            <Link href="/docs/api-reference" className={cn(ghostCta, "w-full sm:w-auto")}>
              <Terminal aria-hidden className="size-4 text-zinc-400" />
              Voir la documentation API
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-zinc-500">
            Gratuit jusqu&apos;à {FREE_CONTACTS} contacts · Sans carte bancaire · Tarifs en FCFA
          </p>
        </div>

        <div className="mt-14 md:mx-auto md:mt-16 md:max-w-[1080px] lg:mt-20">
          <HeroConsole />
        </div>
      </Container>
    </section>
  );
}

/* ───────── 2.3 Infrastructure strip ───────── */

function InfraStrip() {
  const items = (hidden: boolean) =>
    INFRA.map(({ Icon, label }) => (
      <li
        key={`${label}-${hidden ? "b" : "a"}`}
        aria-hidden={hidden || undefined}
        className={cn(
          "flex shrink-0 items-center gap-2 px-5 font-mono text-[12px] text-zinc-400",
          hidden && "mp-marquee-dup lg:hidden",
        )}
      >
        <Icon aria-hidden className="size-3.5 text-zinc-500" />
        {label}
      </li>
    ));

  return (
    <section aria-labelledby="infra-title" className="border-y border-white/[0.06] py-8">
      <Container>
        <p id="infra-title" className="text-center text-[13px] text-zinc-500">
          Construit sur une infrastructure que vous connaissez déjà
        </p>
      </Container>
      <div className="mp-marquee mt-5 overflow-hidden">
        <ul className="mp-marquee-track">
          {items(false)}
          {items(true)}
        </ul>
      </div>
    </section>
  );
}

/* ───────── 2.4 Problem ───────── */

function Problems() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <Reveal className="max-w-[520px]">
            <Eyebrow>Le constat</Eyebrow>
            <H2 className="mt-4">Trois outils, trois factures, aucune vue d&apos;ensemble.</H2>
            <Lead className="mt-5">
              Le problème n&apos;est pas d&apos;envoyer. C&apos;est de savoir ce qui s&apos;est passé ensuite.
            </Lead>
          </Reveal>
          <Stagger className="grid gap-4">
            {PROBLEMS.map((p, i) => (
              <StaggerItem key={p.title}>
                <article className={cn(cardClass, "grid gap-5 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8 lg:grid-cols-1 xl:grid-cols-[1fr_auto]")}>
                  <div>
                    <p className="font-mono text-xs text-zinc-500">0{i + 1}</p>
                    <h3 className="mt-2 text-lg font-semibold tracking-[-0.015em] text-zinc-50 md:text-xl">{p.title}</h3>
                    <p className="mt-2 max-w-[460px] text-pretty text-[15px] leading-[1.6] text-zinc-400 md:text-base">
                      {p.text}
                    </p>
                  </div>
                  <div className="rounded-[10px] border border-white/[0.06] bg-zinc-950/60 px-4 py-3 font-mono text-[12px] leading-6 md:min-w-[250px]">
                    {p.log.map(([a, b]) => (
                      <p key={a + b} className="flex gap-3 whitespace-nowrap">
                        <span className="text-zinc-500">{a}</span>
                        <span className="text-zinc-300">{b}</span>
                      </p>
                    ))}
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Container>
    </section>
  );
}

/* ───────── 2.5 Bento ───────── */

function Platform() {
  return (
    <section id="plateforme" className="scroll-mt-20 py-16 md:py-24 lg:py-32">
      <Container>
        <Reveal className="max-w-[720px]">
          <Eyebrow>La plateforme</Eyebrow>
          <H2 className="mt-4">Tout ce qu&apos;il faut pour parler à vos contacts. Rien de plus.</H2>
          <Lead className="mt-5">Une base de contacts, trois canaux, un suivi unique.</Lead>
        </Reveal>

        <Stagger className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-6 lg:grid-rows-[auto_auto_auto]">
          <BentoCard
            className="md:col-span-2 lg:col-span-4 lg:row-span-2"
            title="Un message, trois canaux"
            text="Écrivez une fois. Envoyez par e-mail, WhatsApp ou SMS selon ce que chaque contact lit vraiment."
          >
            <ChannelsMock />
          </BentoCard>
          <BentoCard
            className="lg:col-span-2"
            title="Ouvertures et clics, en direct"
            text="Pixel d'ouverture, liens suivis, rebonds et plaintes remontés dès que le fournisseur les signale."
          >
            <TrackingMock />
          </BentoCard>
          <BentoCard
            className="lg:col-span-2"
            title="Des segments qui se tiennent à jour"
            text="Import CSV, champs personnalisés, tags et segments dynamiques."
          >
            <ContactsMock />
          </BentoCard>
          <BentoCard
            className="lg:col-span-3"
            title="Des parcours, pas des listes"
            text="Déclencheur, délai, condition, action. Dessinez le parcours, MailPulse l'exécute."
          >
            <AutomationMock />
          </BentoCard>
          <BentoCard
            className="lg:col-span-3"
            title="Des codes de vérification, livrés"
            text="Un code à usage unique par WhatsApp, avec expiration et limite d'essais gérées pour vous."
          >
            <CodeMock />
          </BentoCard>
        </Stagger>
      </Container>
    </section>
  );
}

/* ───────── 2.6 Story ───────── */

function HowItWorks() {
  return (
    <section id="fonctionnement" className="scroll-mt-20 pb-16 md:pb-24 lg:pb-32">
      <div className="mp-divider mx-auto mb-16 max-w-[1200px] md:mb-24" />
      <Container>
        <Reveal className="max-w-[720px]">
          <Eyebrow>Comment ça marche</Eyebrow>
          <H2 className="mt-4">D&apos;un envoi à une réponse, sans rien perdre en route.</H2>
        </Reveal>
        <div className="mt-12 lg:mt-4">
          <Story />
        </div>
      </Container>
    </section>
  );
}

/* ───────── 2.7 Developers ───────── */

function Developers() {
  return (
    <section id="developpeurs" className="scroll-mt-20 border-y border-white/[0.06] bg-zinc-900/20 py-16 md:py-24 lg:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          <Reveal className="lg:col-span-5">
            <Eyebrow>Pour les développeurs</Eyebrow>
            <H2 className="mt-4">Une requête pour envoyer. Un webhook pour tout savoir.</H2>
            <Lead className="mt-5">
              API REST, clés par organisation, webhooks signés. La même API alimente notre propre interface.
            </Lead>
            <ul className="mt-8 space-y-3">
              {DEV_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-[15px] leading-[1.5] text-zinc-300">
                  <Check aria-hidden className="mt-1 size-3.5 shrink-0 text-orange-400" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link href="/docs" className={ghostCta}>
                <BookOpen aria-hidden className="size-4 text-zinc-400" />
                Lire la documentation
              </Link>
              <Link
                href="/docs/api-reference#webhooks-sortants"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm text-zinc-400 underline-offset-4 transition-colors hover:text-zinc-50 hover:underline"
              >
                <Code2 aria-hidden className="size-4" />
                Voir le format des webhooks
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="min-w-0 lg:col-span-7">
            <CodeBlock />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/* ───────── 2.8 Live analytics ───────── */

function Live() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <Container>
        <Reveal className="max-w-[720px]">
          <Eyebrow>En direct</Eyebrow>
          <H2 className="mt-4">Le tableau de bord se met à jour pendant que vous le regardez.</H2>
          <Lead className="mt-5">
            Pas de rapport à générer, pas de page à rafraîchir. Livraisons, ouvertures, clics et désabonnements
            s&apos;affichent au fil de l&apos;eau.
          </Lead>
        </Reveal>
        <Reveal delay={0.1} className="mt-12">
          <LiveAnalytics />
        </Reveal>
      </Container>
    </section>
  );
}

/* ───────── 2.9 Pricing ───────── */

function Pricing() {
  return (
    <section id="tarifs" className="scroll-mt-20 border-t border-white/[0.06] py-16 md:py-24 lg:py-32">
      {/* The tracker looks up #pricing; keep this anchor. */}
      <span id="pricing" aria-hidden className="block" />
      <PricingSectionTracker />
      <Container>
        <Reveal className="mx-auto max-w-[640px] text-center">
          <Eyebrow>Tarifs</Eyebrow>
          <H2 className="mt-4">Des prix en FCFA, sans surprise.</H2>
          <Lead className="mt-5">Commencez gratuitement. Passez au plan Pro quand vos envois décollent.</Lead>
        </Reveal>

        <Stagger className="mt-12 grid items-start gap-4 md:mt-16 md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = PLAN_LIMITS[plan.tier].priceFCFA;
            return (
              <StaggerItem
                key={plan.tier}
                className={cn(plan.highlighted ? "order-first md:order-none md:-mt-4" : "")}
              >
                <article
                  className={cn(
                    cardClass,
                    "flex h-full flex-col p-6 md:p-8",
                    plan.highlighted && "border-white/[0.14] bg-zinc-900 md:pb-12",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-[-0.015em] text-zinc-50">{plan.name}</h3>
                    {plan.highlighted ? (
                      <span className="rounded-full border border-orange-500/30 px-2.5 py-0.5 font-mono text-[11px] text-orange-300">
                        Recommandé
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{plan.desc}</p>
                  <p className="mt-6 flex items-baseline gap-2">
                    {price >= 0 ? (
                      <>
                        <span className="font-mono text-[40px] font-medium leading-none tabular-nums tracking-[-0.03em] text-zinc-50">
                          {formatNumber(price)}
                        </span>
                        <span className="text-sm text-zinc-400">FCFA / mois</span>
                      </>
                    ) : (
                      <span className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-zinc-50">Sur devis</span>
                    )}
                  </p>
                  <ul className="mt-8 flex-1 space-y-3">
                    {PLAN_CATALOG[plan.tier].features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[15px] leading-[1.45] text-zinc-300">
                        <Check aria-hidden className="mt-1 size-3.5 shrink-0 text-orange-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <LandingCTATracker location={`pricing_${plan.tier.toLowerCase()}`}>
                    <Link
                      href={plan.href}
                      className={cn(plan.highlighted ? primaryCta : ghostCta, "mt-8 w-full")}
                    >
                      {plan.cta}
                    </Link>
                  </LandingCTATracker>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
        <p className="mt-8 text-center text-[13px] text-zinc-500">
          Tarifs par organisation. Une question sur les volumes ?{" "}
          <Link href="/contact" className="text-zinc-300 underline underline-offset-4 hover:text-zinc-50">
            Écrivez-nous
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}

/* ───────── 2.10 FAQ ───────── */

function Faq() {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <H2>Questions fréquentes</H2>
              <p className="mt-4 text-[15px] leading-[1.6] text-zinc-400">
                Une question qui n&apos;est pas ici ?{" "}
                <Link href="/contact" className="text-zinc-200 underline underline-offset-4 hover:text-zinc-50">
                  Écrivez à l&apos;équipe
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="mp-faq lg:col-span-8">
            {FAQ.map((item) => (
              <details key={item.q} name="faq" className="group border-b border-white/[0.06]">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[17px] font-medium tracking-[-0.01em] text-zinc-100 transition-colors hover:text-zinc-50">
                  {item.q}
                  <ChevronDown
                    aria-hidden
                    className="mp-faq-chevron size-4 shrink-0 text-zinc-500 transition-transform duration-200"
                  />
                </summary>
                <p className="max-w-[640px] pb-6 text-pretty text-[15px] leading-[1.6] text-zinc-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ───────── 2.11 Final CTA ───────── */

function FinalCta() {
  return (
    <section className="pb-16 md:pb-24 lg:pb-32">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-zinc-900 px-6 py-16 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] md:px-12 md:py-24">
            <div aria-hidden className="mp-grid mp-grid--bottom pointer-events-none absolute inset-0" />
            <div
              aria-hidden
              className="mp-breathe pointer-events-none absolute -bottom-40 left-1/2 h-[320px] w-[720px] max-w-[160vw] -translate-x-1/2 rounded-full bg-orange-500 opacity-[0.1] blur-[100px]"
            />
            <div className="relative mx-auto max-w-[640px]">
              <H2>Votre prochain envoi peut partir dans dix minutes.</H2>
              <Lead className="mx-auto mt-5">Créez un compte, importez une liste, envoyez. On s&apos;occupe du suivi.</Lead>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <LandingCTATracker location="footer_cta">
                  <Link href="/login" className={cn(primaryCta, "w-full sm:w-auto")}>
                    Commencer gratuitement
                    <ArrowRight aria-hidden className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                </LandingCTATracker>
                <Link href="/contact" className={cn(ghostCta, "w-full sm:w-auto")}>
                  Parler à l&apos;équipe
                </Link>
              </div>
              <p className="mt-4 text-[13px] text-zinc-500">Sans carte bancaire · Interface en français</p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/* ───────── Footer ───────── */

const FOOTER = [
  {
    title: "Produit",
    links: [
      { label: "Plateforme", href: "#plateforme" },
      { label: "Fonctionnement", href: "#fonctionnement" },
      { label: "Tarifs", href: "#tarifs" },
    ],
  },
  {
    title: "Documentation",
    links: [
      { label: "Démarrage", href: "/docs/demarrage" },
      { label: "Campagnes", href: "/docs/campagnes" },
      { label: "Automatisations", href: "/docs/automations" },
      { label: "WhatsApp", href: "/docs/whatsapp" },
    ],
  },
  {
    title: "Développeurs",
    links: [
      { label: "Référence API", href: "/docs/api-reference" },
      { label: "Webhooks", href: "/docs/api-reference#webhooks-sortants" },
      { label: "Codes de vérification", href: "/docs/verifications" },
      { label: "Documentation en anglais", href: "/en/docs" },
    ],
  },
  {
    title: "Compte",
    links: [
      { label: "Se connecter", href: "/login" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

function Footer() {
  return (
    <footer id="mp-footer" className="relative overflow-hidden border-t border-white/[0.06] pt-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-[280px]">
            <Logo />
            <p className="mt-3 text-[13px] leading-[1.6] text-zinc-500">
              E-mail, WhatsApp et SMS depuis une seule plateforme, avec le suivi de chaque message.
            </p>
          </div>
          <nav aria-label="Pied de page" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-4">
            {FOOTER.map((col) => (
              <div key={col.title}>
                <p className="text-[13px] font-medium text-zinc-300">{col.title}</p>
                <ul className="mt-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-[13px] text-zinc-500 transition-colors hover:text-zinc-200 sm:min-h-9"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] py-6 text-[13px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MailPulse</p>
          <p>Prix en FCFA · Interface en français</p>
        </div>
      </Container>
      <p
        aria-hidden
        className="pointer-events-none -mb-[0.26em] select-none text-center text-[18vw] font-semibold leading-none tracking-[-0.06em] text-white/[0.03]"
      >
        MailPulse
      </p>
    </footer>
  );
}
