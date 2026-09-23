"use client";

import { HelpModal, StepList, LinkOut } from "@/components/dashboard/help-modal";

export function SenderHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <HelpModal
      open={open}
      onClose={onClose}
      title="Configurer un expéditeur"
      subtitle="Guide complet pas-à-pas"
      sections={[
        {
          title: "Qu'est-ce qu'un expéditeur ?",
          defaultOpen: true,
          content: (
            <div className="space-y-3">
              <p>
                Un <strong className="text-zinc-200">expéditeur</strong> est l&apos;adresse email qui apparaît dans le champ &laquo; De &raquo; quand vos contacts reçoivent votre email. C&apos;est votre identité d&apos;envoi.
              </p>
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-3">
                <p className="text-xs text-zinc-400">Exemple dans la boîte de réception :</p>
                <p className="text-sm text-zinc-200 font-mono mt-1">
                  De : <strong>Mon Entreprise</strong> &lt;newsletter@monsite.com&gt;
                </p>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-zinc-200">Nom</strong> : le nom qui s&apos;affiche (ex : &laquo; Mon Entreprise &raquo;, &laquo; L&apos;équipe MailPulse &raquo;)</li>
                <li><strong className="text-zinc-200">Adresse email</strong> : l&apos;adresse d&apos;envoi (ex : newsletter@monsite.com)</li>
                <li><strong className="text-zinc-200">Email de réponse</strong> : l&apos;adresse où arrivent les réponses des destinataires (optionnel, par défaut c&apos;est l&apos;adresse d&apos;envoi)</li>
              </ul>
            </div>
          ),
        },
        {
          title: "Lien avec les domaines",
          content: (
            <div className="space-y-3">
              <p>
                L&apos;adresse email de l&apos;expéditeur doit utiliser un <strong className="text-zinc-200">domaine vérifié</strong>. Si vous n&apos;avez pas de domaine vérifié, vous ne pouvez utiliser que <code className="text-orange-400">onboarding@resend.dev</code> (domaine de test).
              </p>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                <p className="text-amber-400 text-xs font-medium mb-1">Important</p>
                <p className="text-xs">
                  Si vous avez vérifié le domaine <code>mail.monsite.com</code>, vous pouvez créer des expéditeurs avec n&apos;importe quel préfixe : <code>newsletter@mail.monsite.com</code>, <code>contact@mail.monsite.com</code>, <code>info@mail.monsite.com</code>, etc.
                </p>
              </div>
              <StepList steps={[
                "D'abord, configurez votre domaine dans la section Envoi → Domaines",
                "Attendez que la vérification soit terminée (coche verte)",
                "Revenez ici pour créer un expéditeur avec ce domaine",
                "Le domaine vérifié apparaîtra dans le sélecteur @ lors de la création",
              ]} />
            </div>
          ),
        },
        {
          title: "Comment créer un expéditeur",
          content: (
            <div className="space-y-3">
              <StepList steps={[
                "Cliquez sur « Créer un expéditeur » en haut de la page",
                "Remplissez le Nom (ex : « Mon Entreprise »). C'est ce que vos contacts verront",
                "Tapez le préfixe email (la partie avant @). Ex : newsletter, contact, info",
                "Sélectionnez le domaine dans le menu déroulant (vos domaines vérifiés + resend.dev)",
                "Optionnel : ajoutez un email de réponse si les réponses doivent aller à une autre adresse",
                "Cliquez sur « Créer ». Votre expéditeur est prêt à être utilisé dans les campagnes !",
              ]} />
            </div>
          ),
        },
        {
          title: "Bonnes pratiques",
          content: (
            <div className="space-y-3">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-zinc-200">Utilisez un nom reconnaissable</strong> : vos contacts doivent immédiatement savoir qui leur écrit. &laquo; Mon Entreprise &raquo; est mieux que &laquo; Marketing Team &raquo;.
                </li>
                <li>
                  <strong className="text-zinc-200">Séparez les types d&apos;emails</strong> : créez plusieurs expéditeurs, <code className="text-orange-400">newsletter@</code> pour le marketing, <code className="text-orange-400">info@</code> pour les transactionnels, <code className="text-orange-400">equipe@</code> pour le support.
                </li>
                <li>
                  <strong className="text-zinc-200">Configurez l&apos;email de réponse</strong> : si vous envoyez depuis <code>newsletter@</code> mais voulez recevoir les réponses sur <code>support@</code>, remplissez le champ &laquo; Email de réponse &raquo;.
                </li>
                <li>
                  <strong className="text-zinc-200">Évitez les adresses noreply@</strong> : les emails avec &laquo; noreply &raquo; ont un taux d&apos;engagement plus faible et nuisent à votre réputation d&apos;expéditeur.
                </li>
              </ul>
            </div>
          ),
        },
        {
          title: "FAQ",
          content: (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-zinc-300">Puis-je utiliser mon adresse Gmail/Yahoo comme expéditeur ?</p>
                <p className="text-xs mt-1">
                  Non. Gmail et Yahoo ne permettent pas à des services tiers d&apos;envoyer en leur nom. Vous devez utiliser votre propre domaine ou <code className="text-orange-400">onboarding@resend.dev</code> pour les tests.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Combien d&apos;expéditeurs puis-je créer ?</p>
                <p className="text-xs mt-1">
                  Autant que nécessaire. Il n&apos;y a pas de limite sur le nombre d&apos;expéditeurs. Chaque expéditeur doit utiliser un domaine vérifié.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Qu&apos;est-ce que resend.dev ?</p>
                <p className="text-xs mt-1">
                  <code>resend.dev</code> est un domaine de test fourni par Resend. Il fonctionne pour les tests mais les emails envoyés depuis ce domaine ont une délivrabilité limitée et portent la mention &laquo; via resend.dev &raquo; dans Gmail.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Je ne vois pas mon domaine dans le sélecteur ?</p>
                <p className="text-xs mt-1">
                  Seuls les domaines <strong>vérifiés</strong> apparaissent. Allez dans <LinkOut href="/dashboard/domains">Envoi → Domaines</LinkOut> et vérifiez que votre domaine a une coche verte.
                </p>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
