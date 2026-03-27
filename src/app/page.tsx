import Link from "next/link";
import { ArrowRight, Mail, BarChart3, Zap, Target } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-orange-500" />
            <span className="text-xl font-semibold tracking-tight">MailPulse</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="text-sm bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            Campagnes email
            <br />
            <span className="text-orange-500">qui convertissent</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Envoyez, trackez et optimisez vos campagnes email. Open tracking,
            click tracking, A/B testing, automations et analytics en temps reel.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Demarrer maintenant
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Mail,
                title: "Campagnes",
                desc: "Editeur drag & drop, templates, A/B testing sur les sujets et le contenu",
              },
              {
                icon: BarChart3,
                title: "Analytics",
                desc: "Open rate, CTR, bounces, heat maps, revenue attribution en temps reel",
              },
              {
                icon: Zap,
                title: "Automations",
                desc: "Drip campaigns, triggers, workflows conditionnels, send time optimization",
              },
              {
                icon: Target,
                title: "Segmentation",
                desc: "Tags, scoring, RFM, segments dynamiques, prediction de churn",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50"
              >
                <feature.icon className="h-8 w-8 text-orange-500 mb-4" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-6">
        <div className="max-w-6xl mx-auto text-center text-sm text-zinc-500">
          &copy; {new Date().getFullYear()} MailPulse. Open source email marketing.
        </div>
      </footer>
    </div>
  );
}
