import { Terminal } from "lucide-react";

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 overflow-hidden my-6">
      {title && (
        <div className="px-4 py-2.5 border-b border-zinc-800/50 flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-500 font-mono">{title}</span>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono text-zinc-300 leading-relaxed">{children}</code>
      </pre>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 text-sm text-zinc-300 leading-relaxed">
      {children}
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-500/10 text-orange-400 text-xs font-mono font-bold mr-2 shrink-0">
      {n}
    </span>
  );
}

export default function InstallationPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-xs font-medium mb-4">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
          </span>
          Demarrage
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-mono">
          Installation
        </h1>
        <p className="mt-3 text-zinc-400 text-lg leading-relaxed">
          Creez votre compte MailPulse, configurez votre organisation et
          commencez a envoyer des emails en quelques minutes.
        </p>
      </div>

      {/* Creer un compte */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Creer votre compte</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              Rendez-vous sur{" "}
              <span className="text-orange-400 font-mono text-sm">app.mailpulse.io/register</span>{" "}
              et renseignez votre adresse email professionnelle ainsi qu&apos;un mot de passe securise.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              Verifiez votre boite de reception : un email de confirmation vous sera envoye.
              Cliquez sur le lien pour activer votre compte.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={3} />
            <p>
              Vous pouvez egalement vous connecter avec votre compte Google en un clic
              via le bouton <span className="text-zinc-200 font-medium">&quot;Continuer avec Google&quot;</span>.
            </p>
          </div>
        </div>
        <InfoBox>
          <strong className="text-orange-400">Conseil :</strong> Utilisez une adresse email professionnelle
          (ex: vous@entreprise.com) plutot qu&apos;une adresse personnelle. Cela ameliore la
          delivrabilite de vos futures campagnes.
        </InfoBox>
      </div>

      {/* Organisation */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Configurer votre organisation</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Une fois connecte, MailPulse vous invite a creer votre premiere organisation.
            L&apos;organisation est l&apos;espace de travail partage par votre equipe.
          </p>
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              Choisissez un <span className="text-zinc-200 font-medium">nom d&apos;organisation</span> (ex: &quot;Mon Entreprise&quot;).
              Ce nom apparaitra dans l&apos;interface et dans les rapports.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              Ajoutez un <span className="text-zinc-200 font-medium">logo</span> (optionnel).
              Il sera utilise dans vos templates d&apos;email par defaut.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={3} />
            <p>
              Invitez des membres de votre equipe en renseignant leurs adresses email.
              Vous pourrez definir des roles (Admin, Editeur, Lecteur) pour chaque membre.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
          <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-3">Roles disponibles</h3>
          <div className="space-y-2">
            {[
              { role: "Admin", desc: "Acces complet : campagnes, contacts, parametres, facturation, gestion des membres" },
              { role: "Editeur", desc: "Creer et envoyer des campagnes, gerer les contacts et templates" },
              { role: "Lecteur", desc: "Consulter les analytics et les campagnes (lecture seule)" },
            ].map((item) => (
              <div key={item.role} className="flex items-start gap-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                  {item.role}
                </span>
                <span className="text-sm text-zinc-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Domaine d'envoi */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Configurer votre domaine d&apos;envoi</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            Pour envoyer des emails depuis votre propre domaine (ex: newsletter@entreprise.com),
            vous devez configurer trois enregistrements DNS. Pas de panique, c&apos;est plus simple
            qu&apos;il n&apos;y parait.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          {/* SPF */}
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
            <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-2">
              <span className="text-orange-400">1.</span> SPF (Sender Policy Framework)
            </h3>
            <p className="text-sm text-zinc-400 mb-3">
              Le SPF indique aux serveurs de messagerie quels serveurs sont autorises a
              envoyer des emails au nom de votre domaine. C&apos;est comme une liste blanche d&apos;expediteurs.
            </p>
            <CodeBlock title="Enregistrement DNS TXT">{`Type:  TXT
Nom:   @
Valeur: v=spf1 include:send.mailpulse.io ~all`}</CodeBlock>
          </div>

          {/* DKIM */}
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
            <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-2">
              <span className="text-orange-400">2.</span> DKIM (DomainKeys Identified Mail)
            </h3>
            <p className="text-sm text-zinc-400 mb-3">
              Le DKIM ajoute une signature numerique a chaque email que vous envoyez.
              Cela prouve que le message n&apos;a pas ete modifie en transit. Pensez-y comme
              un sceau de cire numerique.
            </p>
            <CodeBlock title="Enregistrement DNS CNAME">{`Type:  CNAME
Nom:   mailpulse._domainkey
Valeur: dkim.mailpulse.io`}</CodeBlock>
          </div>

          {/* DMARC */}
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-5">
            <h3 className="text-sm font-mono font-semibold text-zinc-200 mb-2">
              <span className="text-orange-400">3.</span> DMARC (Domain-based Message Authentication)
            </h3>
            <p className="text-sm text-zinc-400 mb-3">
              Le DMARC definit la politique a appliquer quand un email echoue aux verifications
              SPF ou DKIM. Il vous permet aussi de recevoir des rapports sur les tentatives
              d&apos;usurpation de votre domaine.
            </p>
            <CodeBlock title="Enregistrement DNS TXT">{`Type:  TXT
Nom:   _dmarc
Valeur: v=DMARC1; p=quarantine; rua=mailto:dmarc@entreprise.com`}</CodeBlock>
          </div>
        </div>

        <InfoBox>
          <strong className="text-orange-400">Verification automatique :</strong> Une fois les
          enregistrements DNS ajoutes, retournez dans{" "}
          <span className="font-mono text-zinc-200">Parametres &gt; Domaines</span> et cliquez
          sur &quot;Verifier&quot;. La propagation DNS peut prendre jusqu&apos;a 48h, mais elle est
          generalement effective en quelques minutes.
        </InfoBox>
      </div>

      {/* Fournisseur email */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4 font-mono">Connecter votre fournisseur email</h2>
        <div className="prose-sm text-zinc-400 space-y-3">
          <p>
            MailPulse utilise Resend comme infrastructure d&apos;envoi par defaut. Votre compte
            inclut deja une integration prete a l&apos;emploi.
          </p>
          <div className="flex items-start gap-2">
            <StepNumber n={1} />
            <p>
              Allez dans{" "}
              <span className="font-mono text-zinc-200">Parametres &gt; Fournisseurs</span>.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={2} />
            <p>
              Selectionnez <span className="text-zinc-200 font-medium">Resend</span> (pre-configure)
              ou connectez votre propre cle API si vous disposez d&apos;un compte Resend existant.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <StepNumber n={3} />
            <p>
              Envoyez un email de test pour confirmer que tout fonctionne. Utilisez le bouton{" "}
              <span className="text-zinc-200 font-medium">&quot;Envoyer un test&quot;</span> dans
              la page de configuration.
            </p>
          </div>
        </div>

        <CodeBlock title="Exemple - Cle API Resend">{`# Votre cle API Resend (disponible dans les parametres)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Domaine d'envoi verifie
FROM_EMAIL=newsletter@votre-domaine.com`}</CodeBlock>

        <InfoBox>
          <strong className="text-orange-400">Limites d&apos;envoi :</strong> Le plan gratuit permet
          d&apos;envoyer jusqu&apos;a 3 000 emails par mois. Les plans Pro et Enterprise offrent
          des volumes illimites avec des IPs dediees pour une delivrabilite optimale.
        </InfoBox>
      </div>

      {/* Etape suivante */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 p-6 text-center">
        <p className="text-zinc-400 text-sm mb-2">Votre compte est pret !</p>
        <p className="text-zinc-300 font-medium">
          Prochaine etape :{" "}
          <a href="/docs/first-campaign" className="text-orange-400 hover:text-orange-300 underline underline-offset-4 transition-colors">
            Envoyer votre premiere campagne
          </a>
        </p>
      </div>
    </div>
  );
}
