import Link from "next/link";
import {
  ArrowRight,
  Mail,
  BarChart3,
  Zap,
  Target,
  MousePointerClick,
  Eye,
  Shield,
  Globe,
  Sparkles,
  Check,
} from "lucide-react";
import { HeroGlow } from "@/components/landing/hero-glow";
import { Navbar } from "@/components/landing/navbar";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/landing/animated-section";
import { PulseLine } from "@/components/landing/pulse-line";
import { MetricCard } from "@/components/landing/metric-card";

const features = [
  {
    icon: Mail,
    title: "Campagnes intelligentes",
    desc: "Editeur visuel, templates personnalisables, A/B testing automatise sur les sujets, le contenu et les horaires d'envoi.",
    gradient: "from-orange-500/10 to-transparent",
  },
  {
    icon: BarChart3,
    title: "Analytics temps reel",
    desc: "Open rate, CTR, bounces, heat maps email, revenue attribution. Dashboard live powered by Convex.",
    gradient: "from-amber-500/10 to-transparent",
  },
  {
    icon: Zap,
    title: "Automations avancees",
    desc: "Drip campaigns, triggers evenementiels, workflows conditionnels, send time optimization par IA.",
    gradient: "from-orange-600/10 to-transparent",
  },
  {
    icon: Target,
    title: "Segmentation precise",
    desc: "Tags, scoring d'engagement, RFM, segments dynamiques, prediction de churn et lifecycle management.",
    gradient: "from-yellow-500/10 to-transparent",
  },
  {
    icon: MousePointerClick,
    title: "Click tracking avance",
    desc: "Chaque lien tracke individuellement. Redirect 302, heat maps de clics, attribution par campagne.",
    gradient: "from-orange-500/10 to-transparent",
  },
  {
    icon: Shield,
    title: "Compliance integree",
    desc: "GDPR, CAN-SPAM, List-Unsubscribe one-click, double opt-in, gestion du consentement automatisee.",
    gradient: "from-amber-500/10 to-transparent",
  },
];

const trackingFeatures = [
  { icon: Eye, label: "Open tracking", desc: "Pixel invisible 1x1" },
  { icon: MousePointerClick, label: "Click tracking", desc: "Redirect 302 signe HMAC" },
  { icon: Globe, label: "Geo & Device", desc: "Localisation et appareil" },
  { icon: Sparkles, label: "Engagement score", desc: "Scoring automatique" },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "0",
    desc: "Pour demarrer",
    features: ["1 000 contacts", "5 000 emails/mois", "Templates de base", "Analytics essentiels"],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "15 000",
    desc: "Pour les equipes",
    features: [
      "25 000 contacts",
      "Emails illimites",
      "A/B testing",
      "Automations",
      "Segmentation avancee",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    desc: "Pour les grandes equipes",
    features: [
      "Contacts illimites",
      "Dedicated IP",
      "SSO / SAML",
      "SLA garanti",
      "Account manager",
      "API avancee",
    ],
    cta: "Nous contacter",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      <Navbar />

      <main className="flex-1">
        {/* ─── Hero ─── */}
        <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
          <HeroGlow />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-medium mb-8 tracking-wide">
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
                <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                  meritent mieux
                </span>
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Tracking pixel-level, analytics en temps reel, automations
                intelligentes. Tout ce qu&apos;il faut pour envoyer des emails qui
                convertissent.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.3}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-7 py-3.5 rounded-xl font-medium transition-all hover:shadow-xl hover:shadow-orange-500/25 hover:-translate-y-0.5"
                >
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 px-6 py-3.5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all text-sm"
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
                      className="px-3 py-1 rounded-md bg-zinc-900/80 border border-zinc-800/50 text-xs text-zinc-500 font-mono"
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
        <section className="py-16 border-y border-zinc-800/50">
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
                  <span className="text-zinc-500">les entreprises africaines.</span>
                </h2>
                <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
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
                  <div className="p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/20 h-full">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/10 mb-4">
                      {item.badge}
                    </span>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{item.desc}</p>
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
                  <span className="text-zinc-500">Rien de superflu.</span>
                </h2>
              </div>
            </AnimatedSection>

            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => (
                <StaggerItem key={feature.title}>
                  <div className="group relative p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700/50 transition-all duration-300 h-full">
                    {/* Gradient accent on hover */}
                    <div
                      className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />
                    <div className="relative">
                      <div className="inline-flex p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/10 mb-4">
                        <feature.icon className="h-5 w-5 text-orange-500" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">
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
        <section id="tracking" className="py-20 md:py-32 border-y border-zinc-800/50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <AnimatedSection>
                <span className="text-xs font-mono text-orange-500 uppercase tracking-[0.2em]">
                  Tracking
                </span>
                <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight font-mono">
                  Chaque interaction
                  <br />
                  <span className="text-zinc-500">est mesuree.</span>
                </h2>
                <p className="mt-4 text-zinc-400 leading-relaxed">
                  Pixel d&apos;ouverture invisible, redirect signe HMAC pour les clics,
                  webhooks Resend pour les bounces et complaints. Tout est trace,
                  rien n&apos;echappe a votre dashboard.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  {trackingFeatures.map((tf) => (
                    <div
                      key={tf.label}
                      className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/30"
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
                <div className="relative p-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
                  {/* Fake terminal */}
                  <div className="flex items-center gap-1.5 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                    <span className="ml-3 text-xs text-zinc-600 font-mono">
                      webhook events
                    </span>
                  </div>

                  <div className="font-mono text-xs space-y-2 text-zinc-500">
                    {[
                      { time: "23:04:12", event: "email.delivered", color: "text-emerald-400", email: "marie@startup.io" },
                      { time: "23:04:15", event: "email.opened", color: "text-blue-400", email: "jean@corp.fr" },
                      { time: "23:04:18", event: "email.clicked", color: "text-orange-400", email: "marie@startup.io" },
                      { time: "23:04:22", event: "email.delivered", color: "text-emerald-400", email: "alex@dev.co" },
                      { time: "23:04:25", event: "email.opened", color: "text-blue-400", email: "alex@dev.co" },
                      { time: "23:04:31", event: "email.clicked", color: "text-orange-400", email: "alex@dev.co" },
                      { time: "23:04:33", event: "email.opened", color: "text-blue-400", email: "sarah@agency.com" },
                    ].map((log, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="text-zinc-700">{log.time}</span>
                        <span className={log.color}>{log.event}</span>
                        <span className="text-zinc-600">{log.email}</span>
                      </div>
                    ))}
                    <div className="flex gap-3">
                      <span className="text-zinc-700">23:04:35</span>
                      <span className="text-zinc-600 animate-pulse">|</span>
                    </div>
                  </div>

                  {/* Subtle gradient overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-zinc-900/80 to-transparent" />
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        <PulseLine />

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
                <p className="mt-3 text-zinc-500">
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
                        ? "border-orange-500/30 bg-orange-500/5 shadow-lg shadow-orange-500/5"
                        : "border-zinc-800/50 bg-zinc-900/30"
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-orange-600 text-[10px] font-semibold uppercase tracking-wider">
                        Populaire
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1">{plan.desc}</p>
                      <div className="mt-4 flex items-baseline gap-1">
                        {plan.price !== "Sur mesure" ? (
                          <>
                            <span className="text-4xl font-bold font-mono">
                              {plan.price}
                            </span>
                            <span className="text-zinc-500 text-sm">FCFA/mois</span>
                          </>
                        ) : (
                          <span className="text-2xl font-bold">{plan.price}</span>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-2.5 mb-8 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
                          <Check className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/register"
                      className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-all ${
                        plan.highlighted
                          ? "bg-orange-600 hover:bg-orange-500 text-white hover:shadow-lg hover:shadow-orange-500/20"
                          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      }`}
                    >
                      {plan.cta}
                    </Link>
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
                <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  qui comptent ?
                </span>
              </h2>
              <p className="mt-4 text-zinc-400 text-lg">
                Rejoignez MailPulse et transformez vos campagnes.
              </p>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-medium text-lg transition-all hover:shadow-xl hover:shadow-orange-500/25 hover:-translate-y-0.5"
                >
                  Creer mon compte
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-zinc-800/50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">
                Mail<span className="text-orange-500">Pulse</span>
              </span>
            </div>

            <nav className="flex items-center gap-6 text-sm text-zinc-500">
              <a href="https://github.com/James10192/mailpulse" className="hover:text-zinc-300 transition-colors">
                GitHub
              </a>
              <a href="#features" className="hover:text-zinc-300 transition-colors">
                Features
              </a>
              <a href="#pricing" className="hover:text-zinc-300 transition-colors">
                Pricing
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
