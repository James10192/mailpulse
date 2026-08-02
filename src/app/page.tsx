import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Zap,
  Target,
  MousePointerClick,
  Eye,
  Shield,
  Globe,
  Sparkles,
  Check,
  MessageCircle,
} from "lucide-react";
import { PLAN_CATALOG } from "@/lib/plan-catalog";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}
import { HeroGlow } from "@/components/landing/hero-glow";
import { Navbar } from "@/components/landing/navbar";
import { BrandMark } from "@/components/brand-mark";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/landing/animated-section";
import { PulseLine } from "@/components/landing/pulse-line";
import { MetricCard } from "@/components/landing/metric-card";
import { LandingCTATracker, PricingSectionTracker } from "@/components/landing/landing-tracker";

const features = [
  {
    icon: MessageCircle,
    title: "Campagnes email et WhatsApp",
    desc: "Choisissez le canal par campagne, reutilisez vos snippets et ciblez les contacts avec email et numero WhatsApp.",
  },
  {
    icon: BarChart3,
    title: "Analytics temps reel",
    desc: "Ouvertures, clics, messages WhatsApp lus, réponses, bounces et attribution. Dashboard live powered by Convex.",
  },
  {
    icon: Zap,
    title: "Automations avancees",
    desc: "Drip campaigns, triggers evenementiels, workflows conditionnels, send time optimization par IA.",
  },
  {
    icon: Target,
    title: "Segmentation precise",
    desc: "Tags, scoring d'engagement, RFM, segments dynamiques, prediction de churn et lifecycle management.",
  },
  {
    icon: MousePointerClick,
    title: "Click tracking avance",
    desc: "Chaque lien tracke individuellement. Redirect 302, heat maps de clics, attribution par campagne.",
  },
  {
    icon: Shield,
    title: "Compliance integree",
    desc: "GDPR, CAN-SPAM, List-Unsubscribe one-click, double opt-in, gestion du consentement automatisee.",
  },
];

const trackingFeatures = [
  { icon: Eye, label: "Open tracking", desc: "Pixel invisible 1x1" },
  { icon: MousePointerClick, label: "Click tracking", desc: "Redirect 302 signe HMAC" },
  { icon: MessageCircle, label: "WhatsApp tracking", desc: "Lus et reponses par campagne" },
  { icon: Globe, label: "Geo & Device", desc: "Localisation et appareil" },
  { icon: Sparkles, label: "Engagement score", desc: "Scoring automatique" },
];

const pricingPlans = [
  { name: "Starter", price: "0", desc: "Pour démarrer", features: PLAN_CATALOG.FREE.features, cta: "Commencer gratuitement", highlighted: false },
  { name: "Pro", price: "15 000", desc: "Pour les équipes", features: PLAN_CATALOG.PRO.features, cta: "Essai gratuit 14 jours", highlighted: true },
  { name: "Enterprise", price: "Sur mesure", desc: "Pour les grandes équipes", features: PLAN_CATALOG.ENTERPRISE.features, cta: "Nous contacter", highlighted: false },
];

export default function LandingPage() {
  return (
    <div className="mailpulse-landing flex min-h-screen flex-col overflow-x-hidden bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <Navbar />

      <main className="flex-1">
        {/* ─── Hero ─── */}
        <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
          <HeroGlow />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <AnimatedSection>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium tracking-wide text-orange-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
                </span>
                Open source &middot; Self-hostable
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.1}>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] font-mono">
                Vos campagnes email
                <br />
                <span className="text-orange-600">
                  et WhatsApp
                </span>
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 md:text-xl">
                Campagnes email et WhatsApp, analytics en temps reel,
                automations intelligentes. Tout ce qu&apos;il faut pour envoyer,
                suivre les lus et mesurer les réponses.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <LandingCTATracker location="hero">
                  <Link
                    href="/register"
                    className="group inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-7 py-3.5 font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_10px_24px_rgba(234,88,12,0.2)] transition-[scale,background-color] hover:bg-orange-500 active:scale-[0.985]"
                  >
                    Commencer gratuitement
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </LandingCTATracker>
                <a
                  href="#features"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-sm text-zinc-700 shadow-[var(--shadow-border)] transition-[scale,color,box-shadow] hover:text-zinc-950 hover:shadow-[var(--shadow-border-hover)] active:scale-[0.985]"
                >
                  Decouvrir les features
                </a>
              </div>
            </AnimatedSection>

            {/* Tech stack badges */}
            <AnimatedSection delay={0.5}>
              <div className="mt-16 flex items-center justify-center gap-3 flex-wrap">
                {["Next.js 16", "Prisma", "Convex", "Resend", "Cloudflare R2"].map(
                  (tech) => (
                    <span
                      key={tech}
                      className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-xs text-zinc-600"
                    >
                      {tech}
                    </span>
                  )
                )}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ─── Metrics ─── */}
        <section className="border-y border-zinc-200 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <MetricCard value={99.2} suffix="%" label="Delivrabilite" delay={0} />
              <MetricCard value={50} suffix="k+" label="Emails / heure" delay={0.1} />
              <MetricCard value={15} suffix="ms" label="Latence tracking" delay={0.2} />
              <MetricCard value={100} suffix="%" label="Open source" delay={0.3} />
            </div>
          </div>
        </section>

        {/* ─── Made for West Africa ─── */}
        <section className="py-20 md:py-28">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <div className="text-center mb-12">
                <span className="text-xs font-mono text-orange-500 uppercase tracking-[0.2em]">
                  Afrique de l&apos;Ouest
                </span>
                <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight font-mono">
                  Construit pour
                  <br />
                  <span className="text-zinc-600">les entreprises africaines.</span>
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-zinc-600">
                  Pas un outil americain adapte. Une plateforme pensee des le depart
                  pour le marche ouest-africain.
                </p>
              </div>
            </AnimatedSection>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: "Tarifs en FCFA",
                  desc: "Fini les conversions USD. Prix transparents en Francs CFA, paiement Orange Money et MTN Mobile Money.",
                  badge: "XOF",
                },
                {
                  title: "Support francophone",
                  desc: "Une equipe qui parle votre langue, dans votre fuseau horaire. Support en francais par email et WhatsApp.",
                  badge: "FR",
                },
                {
                  title: "Delivrabilite locale",
                  desc: "Infrastructure dediee pour les FAI africains. Vos emails arrivent dans la boite de reception, pas dans les spams.",
                  badge: "99%",
                },
              ].map((item) => (
                <StaggerItem key={item.title}>
                  <div className="h-full rounded-lg border border-zinc-200 bg-white p-6 shadow-[var(--shadow-border)]">
                    <span className="mb-4 inline-block rounded bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-bold text-orange-700 ring-1 ring-orange-200">
                      {item.badge}
                    </span>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-zinc-600">{item.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <PulseLine />

        {/* ─── Features Bento Grid ─── */}
        <section id="features" className="py-20 md:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <AnimatedSection>
              <div className="text-center mb-16">
                <span className="text-xs font-mono text-orange-500 uppercase tracking-[0.2em]">
                  Features
                </span>
                <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight font-mono">
                  Tout pour vos campagnes.
                  <br />
                  <span className="text-zinc-600">Rien de superflu.</span>
                </h2>
              </div>
            </AnimatedSection>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => (
                <StaggerItem key={feature.title}>
                  <div className="h-full rounded-lg border border-zinc-200 bg-white p-6 shadow-[var(--shadow-border)] transition-[box-shadow,border-color] duration-300 hover:border-orange-200 hover:shadow-[var(--shadow-border-hover)]">
                    <div>
                      <div className="mb-4 inline-flex rounded-lg bg-orange-50 p-2.5 ring-1 ring-orange-200">
                        <feature.icon className="h-5 w-5 text-orange-600" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-sm leading-relaxed text-zinc-600">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* ─── Tracking Section ─── */}
        <section id="tracking" className="border-y border-zinc-200 py-20 md:py-32">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <AnimatedSection>
                <span className="text-xs font-mono text-orange-500 uppercase tracking-[0.2em]">
                  Tracking
                </span>
                <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight font-mono">
                  Chaque interaction
                  <br />
                  <span className="text-zinc-600">est mesurée.</span>
                </h2>
                <p className="mt-4 leading-relaxed text-zinc-600">
                  Pixel d&apos;ouverture invisible, redirect signe HMAC pour les clics,
                  webhooks Resend pour les bounces et complaints. Tout est trace,
                  rien n&apos;echappe a votre dashboard.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  {trackingFeatures.map((tf) => (
                    <div
                      key={tf.label}
                      className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3"
                    >
                      <tf.icon className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{tf.label}</div>
                        <div className="text-xs text-zinc-500">{tf.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </AnimatedSection>

              {/* Tracking visualization */}
              <AnimatedSection delay={0.2}>
                <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white p-6 shadow-[var(--shadow-border)]">
                  {/* Fake terminal */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <div className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                    <div className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                    <div className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                    <span className="ml-3 font-mono text-xs text-zinc-500">
                      webhook events
                    </span>
                  </div>

                  <div className="space-y-2 font-mono text-xs text-zinc-600">
                    {[
                      { time: "23:04:12", event: "email.delivered", color: "text-emerald-400", email: "marie@startup.io" },
                      { time: "23:04:15", event: "email.opened", color: "text-orange-600", email: "jean@corp.fr" },
                      { time: "23:04:18", event: "whatsapp.read", color: "text-emerald-400", email: "+2250700000000" },
                      { time: "23:04:22", event: "email.clicked", color: "text-orange-600", email: "marie@startup.io" },
                      { time: "23:04:25", event: "whatsapp.replied", color: "text-orange-600", email: "+2250500000000" },
                      { time: "23:04:31", event: "email.opened", color: "text-orange-600", email: "alex@dev.co" },
                      { time: "23:04:33", event: "whatsapp.delivered", color: "text-emerald-400", email: "+2250100000000" },
                    ].map((log, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-zinc-400">{log.time}</span>
                        <span className={log.color}>{log.event}</span>
                        <span className="text-zinc-500">{log.email}</span>
                      </div>
                    ))}
                    <div className="flex gap-3">
                      <span className="text-zinc-400">23:04:35</span>
                      <span className="animate-pulse text-zinc-500">|</span>
                    </div>
                  </div>

                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        <PulseLine />

        <PricingSectionTracker />
        {/* ─── Pricing ─── */}
        <section id="pricing" className="py-20 md:py-32">
          <div className="max-w-5xl mx-auto px-6">
            <AnimatedSection>
              <div className="text-center mb-16">
                <span className="text-xs font-mono text-orange-500 uppercase tracking-[0.2em]">
                  Pricing
                </span>
                <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight font-mono">
                  Simple et transparent.
                </h2>
                <p className="mt-3 text-zinc-600">
                  Commencez gratuitement. Evoluez quand vous etes pret.
                </p>
              </div>
            </AnimatedSection>

            <StaggerContainer className="grid md:grid-cols-3 gap-4">
              {pricingPlans.map((plan) => (
                <StaggerItem key={plan.name}>
                  <div
                    className={`relative p-6 rounded-2xl border h-full flex flex-col ${
                      plan.highlighted
                        ? "border-orange-500/30 bg-orange-500/5 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.24)]"
                        : "border-zinc-200 bg-white shadow-[var(--shadow-border)]"
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-600 text-[10px] font-semibold uppercase tracking-wider">
                        Populaire
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <p className="mt-1 text-xs text-zinc-600">{plan.desc}</p>
                      <div className="mt-4 flex items-baseline gap-1">
                        {plan.price !== "Sur mesure" ? (
                          <>
                            <span className="text-4xl font-bold font-mono">
                              {plan.price}
                            </span>
                            <span className="text-sm text-zinc-600">FCFA/mois</span>
                          </>
                        ) : (
                          <span className="text-2xl font-bold">{plan.price}</span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-2.5 mb-8 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-700">
                          <Check className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <LandingCTATracker location="pricing">
                      <Link
                        href={plan.cta === "Nous contacter" ? "/contact" : "/register"}
                        className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-[scale,background-color,color,box-shadow] active:scale-[0.985] ${
                          plan.highlighted
                            ? "bg-orange-600 hover:bg-orange-500 text-white "
                            : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {plan.cta}
                      </Link>
                    </LandingCTATracker>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* ─── CTA Final ─── */}
        <section className="py-20 md:py-32">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto px-6 text-center">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight font-mono">
                Pret a envoyer des emails
                <br />
                <span className="text-orange-600">
                  qui comptent ?
                </span>
              </h2>
              <p className="mt-4 text-lg text-zinc-600">
                Rejoignez MailPulse et transformez vos campagnes.
              </p>
              <div className="mt-8">
                <LandingCTATracker location="footer_cta">
                  <Link
                    href="/register"
                    className="group inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-600 px-8 py-4 text-lg font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_10px_24px_rgba(234,88,12,0.2)] transition-[scale,background-color] hover:bg-orange-500 active:scale-[0.985]"
                  >
                    Creer mon compte
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </LandingCTATracker>
              </div>
            </div>
          </AnimatedSection>
        </section>
      </main>

      {/* ─── Equipe ─── */}
      <section id="team" className="border-t border-zinc-200 py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-xs font-mono text-orange-500 uppercase tracking-[0.2em]">
                Equipe
              </span>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight font-mono">
                Les createurs.
              </h2>
              <p className="mt-3 text-zinc-600">
                Les personnes derriere MailPulse.
              </p>
            </div>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* James */}
            <StaggerItem>
              <div className="h-full rounded-lg border border-zinc-200 bg-white p-6 shadow-[var(--shadow-border)] transition-[box-shadow,border-color] duration-300 hover:border-orange-200 hover:shadow-[var(--shadow-border-hover)]">
                <div className="flex items-start gap-5">
                  <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/10 text-orange-500 font-mono font-bold text-lg">
                    MD
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">Marcel DJEDJE-LI</h3>
                    <p className="mt-0.5 font-mono text-sm text-orange-600">Fondateur & Full-Stack Developer</p>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                      Fondateur et architecte de MailPulse. Full-stack developer base a Abidjan, passione par les solutions tech pour l&apos;Afrique francophone.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {["Next.js", "Prisma", "Convex", "Python", "TypeScript"].map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] text-zinc-600"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <a
                        href="https://github.com/James10192"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-950"
                      >
                        <GithubIcon className="h-3.5 w-3.5" />
                        GitHub
                      </a>
                      <a
                        href="https://www.linkedin.com/in/marcel-djedje-li-099490235"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-950"
                      >
                        <LinkedinIcon className="h-3.5 w-3.5" />
                        LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </StaggerItem>

            {/* Ruben */}
            <StaggerItem>
              <div className="h-full rounded-lg border border-zinc-200 bg-white p-6 shadow-[var(--shadow-border)] transition-[box-shadow,border-color] duration-300 hover:border-orange-200 hover:shadow-[var(--shadow-border-hover)]">
                <div className="flex items-start gap-5">
                  <div className="shrink-0 flex items-center justify-center w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/10 text-orange-500 font-mono font-bold text-lg">
                    YR
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">Yablai Yablai Ruben Virgil</h3>
                    <p className="mt-0.5 font-mono text-sm text-orange-600">Co-Fondateur & Frontend / Mobile Developer</p>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                      Developpeur frontend et mobile. Specialise dans les interfaces utilisateur modernes et les applications cross-platform.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {["Flutter", "Next.js", "React", "TypeScript", "Dart"].map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] text-zinc-600"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <a
                        href="https://github.com/yab21"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-950"
                      >
                        <GithubIcon className="h-3.5 w-3.5" />
                        GitHub
                      </a>
                      <a
                        href="https://linkedin.com/in/ruben-yablai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-950"
                      >
                        <LinkedinIcon className="h-3.5 w-3.5" />
                        LinkedIn
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-zinc-200 bg-zinc-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <BrandMark className="text-sm" />

            <nav className="flex items-center gap-6 text-sm text-zinc-500">
              <a href="https://github.com/James10192/mailpulse" className="transition-colors hover:text-zinc-950">
                GitHub
              </a>
              <a href="#features" className="transition-colors hover:text-zinc-950">
                Features
              </a>
              <a href="#pricing" className="transition-colors hover:text-zinc-950">
                Pricing
              </a>
              <a href="/contact" className="transition-colors hover:text-zinc-950">
                Contact
              </a>
            </nav>

            <div className="text-xs text-zinc-600">
              &copy; {new Date().getFullYear()} MailPulse. Open source.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
