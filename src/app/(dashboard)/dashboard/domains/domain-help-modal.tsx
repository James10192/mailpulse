"use client";

import { HelpModal, StepList, LinkOut } from "@/components/dashboard/help-modal";

export function DomainHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <HelpModal
      open={open}
      onClose={onClose}
      title="Configurer votre domaine"
      subtitle="Guide complet pas-à-pas"
      sections={[
        {
          title: "Pourquoi configurer un domaine ?",
          defaultOpen: true,
          content: (
            <div className="space-y-3">
              <p>
                Par défaut, vos emails sont envoyés depuis <strong className="text-zinc-900 dark:text-zinc-100">onboarding@resend.dev</strong>, un domaine partagé. Vos emails risquent d&apos;arriver en spam car Gmail et les autres fournisseurs ne font pas confiance à ce domaine.
              </p>
              <p>
                En configurant <strong className="text-zinc-900 dark:text-zinc-100">votre propre domaine</strong> (ex: <code className="text-orange-600 dark:text-orange-400">newsletter.votresite.com</code>), vous :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Améliorez votre <strong className="text-zinc-900 dark:text-zinc-100">délivrabilité</strong> (moins de spam)</li>
                <li>Renforcez votre <strong className="text-zinc-900 dark:text-zinc-100">image de marque</strong> (emails de contact@votresite.com)</li>
                <li>Protégez votre <strong className="text-zinc-900 dark:text-zinc-100">réputation</strong> d&apos;expéditeur</li>
                <li>Respectez les exigences de Google/Yahoo (SPF + DKIM obligatoires depuis 2024)</li>
              </ul>
            </div>
          ),
        },
        {
          title: "Étape 1 : Choisir votre domaine ou sous-domaine",
          content: (
            <div className="space-y-3">
              <p>
                Vous pouvez utiliser votre domaine principal (<code className="text-orange-600 dark:text-orange-400">votresite.com</code>) ou un sous-domaine dédié (<code className="text-orange-600 dark:text-orange-400">mail.votresite.com</code> ou <code className="text-orange-600 dark:text-orange-400">newsletter.votresite.com</code>).
              </p>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                <p className="text-amber-700 text-xs font-medium mb-1 dark:text-amber-400">Recommandation</p>
                <p className="text-xs">
                  Utilisez un <strong>sous-domaine</strong> (ex: <code>mail.votresite.com</code>) pour isoler la réputation de vos emails marketing de votre domaine principal. Si votre domaine principal a déjà des DNS complexes, un sous-domaine est plus simple à configurer.
                </p>
              </div>
              <StepList steps={[
                "Décidez du domaine ou sous-domaine à utiliser",
                "Cliquez sur « Ajouter un domaine » en haut de cette page",
                "Entrez le domaine complet (ex: mail.votresite.com)",
                "MailPulse va générer les enregistrements DNS à configurer",
              ]} />
            </div>
          ),
        },
        {
          title: "Étape 2 : Configurer les DNS chez votre fournisseur",
          content: (
            <div className="space-y-3">
              <p>
                Après avoir ajouté votre domaine, MailPulse affiche des <strong className="text-zinc-900 dark:text-zinc-100">enregistrements DNS</strong> (SPF et DKIM) à ajouter chez votre <strong className="text-zinc-900 dark:text-zinc-100">registrar</strong> (là où vous avez acheté votre domaine).
              </p>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50 p-3 space-y-2">
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Qu&apos;est-ce que SPF et DKIM ?</p>
                <ul className="text-xs space-y-1">
                  <li><strong className="text-zinc-900 dark:text-zinc-100">SPF</strong> (Sender Policy Framework) : dit aux serveurs email &laquo; ces serveurs ont le droit d&apos;envoyer des emails pour mon domaine &raquo;</li>
                  <li><strong className="text-zinc-900 dark:text-zinc-100">DKIM</strong> (DomainKeys Identified Mail) : ajoute une signature cryptographique à vos emails pour prouver qu&apos;ils n&apos;ont pas été modifiés</li>
                </ul>
              </div>

              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Où ajouter les DNS selon votre fournisseur :</p>
              <ul className="text-xs space-y-2">
                <li><LinkOut href="https://dash.cloudflare.com">Cloudflare</LinkOut> → DNS → Ajouter un enregistrement → Type TXT ou CNAME</li>
                <li><LinkOut href="https://www.namecheap.com/myaccount/login">Namecheap</LinkOut> → Domain List → Manage → Advanced DNS → Add Record</li>
                <li><LinkOut href="https://www.ovh.com/manager/">OVH</LinkOut> → Domaines → Zone DNS → Ajouter une entrée</li>
                <li><LinkOut href="https://domains.google.com">Google Domains</LinkOut> → DNS → Enregistrements personnalisés</li>
                <li><LinkOut href="https://www.gandi.net/fr">Gandi</LinkOut> → Domaines → DNS Records → Ajouter</li>
              </ul>

              <StepList steps={[
                "Connectez-vous à votre registrar (Cloudflare, Namecheap, OVH...)",
                "Allez dans la section DNS / Zone DNS de votre domaine",
                "Ajoutez le record MX : type MX, nom send, valeur feedback-smtp, priorité 10",
                "Ajoutez le record SPF : type TXT, nom send, valeur v=spf1 include:amazonses.com ~all",
                "Ajoutez le record DKIM : type TXT, nom resend._domainkey, valeur qui commence par p=",
                "Sauvegardez les changements. La propagation peut prendre 5 minutes à 48 heures",
              ]} />
            </div>
          ),
        },
        {
          title: "Étape 3 : Vérifier votre domaine",
          content: (
            <div className="space-y-3">
              <p>
                Une fois les DNS configurés, revenez sur cette page et cliquez sur le bouton <strong className="text-zinc-900 dark:text-zinc-100">Vérifier</strong> à côté de votre domaine. MailPulse va vérifier que les enregistrements sont corrects.
              </p>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50 p-3 space-y-1">
                <p className="text-xs"><strong className="text-emerald-700 dark:text-emerald-400">Vérifié (vert)</strong> : tout est bon, vous pouvez envoyer des emails !</p>
                <p className="text-xs"><strong className="text-zinc-800 dark:text-zinc-200">Vérification en cours (gris)</strong> : les DNS ne sont pas encore propagés, réessayez dans quelques minutes.</p>
                <p className="text-xs"><strong className="text-red-600 dark:text-red-400">Échoué (rouge)</strong> : les enregistrements sont incorrects ou manquants, vérifiez vos DNS.</p>
              </div>
              <p>
                Si la vérification échoue après 48 h, vérifiez que vous avez copié les valeurs <strong className="text-zinc-900 dark:text-zinc-100">exactement</strong> comme affichées (pas d&apos;espace en trop, pas de guillemets autour de la valeur TXT).
              </p>
            </div>
          ),
        },
        {
          title: "FAQ",
          content: (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Je n&apos;ai pas de domaine, comment en obtenir un ?</p>
                <p className="text-xs mt-1">
                  Achetez un domaine chez un registrar comme <LinkOut href="https://www.namecheap.com">Namecheap</LinkOut>, <LinkOut href="https://www.ovh.com">OVH</LinkOut>, ou <LinkOut href="https://www.cloudflare.com/products/registrar/">Cloudflare</LinkOut> (à partir de ~5 000 FCFA/an). Utilisez ensuite un sous-domaine dédié pour l&apos;email marketing.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Puis-je utiliser un domaine gratuit (Gmail, Yahoo) ?</p>
                <p className="text-xs mt-1">
                  Non. Les fournisseurs gratuits ne permettent pas de configurer les DNS. Vous devez posséder votre propre domaine.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Combien de temps prend la propagation DNS ?</p>
                <p className="text-xs mt-1">
                  Généralement 5 à 30 minutes. Dans de rares cas, cela peut prendre jusqu&apos;à 48 heures. Cloudflare est souvent le plus rapide (quelques minutes).
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Je peux envoyer sans domaine vérifié ?</p>
                <p className="text-xs mt-1">
                  Oui, mais uniquement depuis <code className="text-orange-600 dark:text-orange-400">onboarding@resend.dev</code>. Vos emails auront moins de chances d&apos;arriver en boîte de réception. C&apos;est acceptable pour tester, pas pour envoyer en production.
                </p>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
