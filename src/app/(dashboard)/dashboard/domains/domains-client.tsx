"use client";

import { useActionState, useState } from "react";
import { Plus, Globe, CheckCircle, Clock, Trash2, X, Info, RefreshCw, Copy, Check, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { createDomain, deleteDomain, verifyDomain } from "./actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { HelpModal, HelpButton, StepList, LinkOut } from "@/components/dashboard/help-modal";
import type { ActionState } from "@/types/action-state";

type DomainData = {
  id: string;
  domain: string;
  resendDomainId: string | null;
  status: string;
  verified: boolean;
  spfRecord: string | null;
  spfStatus: string | null;
  dkimRecord: string | null;
  dkimName: string | null;
  dkimStatus: string | null;
  createdAt: string;
};

export function DomainsClient({ domains }: { domains: DomainData[] }) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createDomain(prev, formData);
      if (result?.success) setOpen(false);
      return result;
    },
    null
  );

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeleting(id);
    await deleteDomain(id);
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Domaines
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Configurez et verifiez vos domaines d&apos;envoi
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Ajouter un domaine
        </button>
      </div>

      <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-300/80">
            Ajoutez votre domaine puis configurez les enregistrements DNS chez votre fournisseur. Cliquez sur &laquo; Comment configurer ? &raquo; pour un guide detaille pas-a-pas.
          </p>
        </div>
        <HelpButton onClick={() => setHelpOpen(true)} />
      </div>

      <DomainHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {domains.length > 0 ? (
        <div className="space-y-4">
          {domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              onDelete={() => setConfirmDeleteId(domain.id)}
              deleting={deleting === domain.id}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
          <Globe className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm mb-4">
            Aucun domaine configure pour le moment.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="text-orange-500 hover:text-orange-400 text-sm font-medium cursor-pointer"
          >
            Ajouter votre premier domaine
          </button>
        </div>
      )}

      {/* Create modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Ajouter un domaine
              </h2>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form action={formAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Domaine
                </label>
                <input
                  name="domain"
                  required
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="ex: mail.mondomaine.com"
                />
              </div>
              {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                  Annuler
                </button>
                <button type="submit" disabled={pending} className="px-4 py-2 text-sm rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium disabled:opacity-50 cursor-pointer">
                  {pending ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer ce domaine ?"
        message="Le domaine sera supprime de Resend et de MailPulse. Cette action est irreversible."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

function DomainCard({
  domain,
  onDelete,
  deleting,
}: {
  domain: DomainData;
  onDelete: () => void;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(!domain.verified);
  const [verifying, setVerifying] = useState(false);

  async function handleVerify() {
    setVerifying(true);
    await verifyDomain(domain.id);
    setVerifying(false);
  }

  const statusBadge = domain.verified ? (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
      <CheckCircle className="h-3 w-3" />
      Verifie
    </span>
  ) : domain.status === "pending" ? (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
      <Clock className="h-3 w-3" />
      Verification en cours
    </span>
  ) : domain.status === "failed" ? (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
      <AlertTriangle className="h-3 w-3" />
      Echoue
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
      <Clock className="h-3 w-3" />
      En attente
    </span>
  );

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
          <span className="text-sm font-mono font-medium text-zinc-900 dark:text-zinc-100">{domain.domain}</span>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2">
          {!domain.verified && (
            <button
              onClick={(e) => { e.stopPropagation(); handleVerify(); }}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-orange-500/30 text-orange-500 rounded-lg hover:bg-orange-500/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${verifying ? "animate-spin" : ""}`} />
              Verifier
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={deleting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (domain.spfRecord || domain.dkimRecord) && (
        <div className="px-5 pb-5 border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4">
          <p className="text-xs text-zinc-500">
            Ajoutez ces enregistrements DNS chez votre fournisseur, puis cliquez sur Verifier.
          </p>

          {domain.spfRecord && (
            <DnsRecord
              label="SPF"
              type="TXT"
              name={domain.domain}
              value={domain.spfRecord}
              status={domain.spfStatus}
            />
          )}

          {domain.dkimRecord && (
            <DnsRecord
              label="DKIM"
              type="CNAME"
              name={domain.dkimName || `default._domainkey.${domain.domain}`}
              value={domain.dkimRecord}
              status={domain.dkimStatus}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DnsRecord({
  label,
  type,
  name,
  value,
  status,
}: {
  label: string;
  type: string;
  name: string;
  value: string;
  status: string | null;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  const statusIcon = status === "verified" ? (
    <CheckCircle className="h-3 w-3 text-emerald-500" />
  ) : status === "failed" ? (
    <AlertTriangle className="h-3 w-3 text-red-500" />
  ) : (
    <Clock className="h-3 w-3 text-amber-500" />
  );

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-mono">{type}</span>
          {statusIcon}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 w-10 shrink-0">Nom</span>
          <code className="flex-1 text-xs font-mono text-zinc-300 bg-zinc-900 px-2 py-1 rounded truncate">{name}</code>
          <button onClick={() => copy(name, `${label}-name`)} className="p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer">
            {copied === `${label}-name` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 w-10 shrink-0">Valeur</span>
          <code className="flex-1 text-xs font-mono text-zinc-300 bg-zinc-900 px-2 py-1 rounded truncate">{value}</code>
          <button onClick={() => copy(value, `${label}-value`)} className="p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer">
            {copied === `${label}-value` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Domain Help Modal ─── */

function DomainHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <HelpModal
      open={open}
      onClose={onClose}
      title="Configurer votre domaine"
      subtitle="Guide complet pas-a-pas"
      sections={[
        {
          title: "Pourquoi configurer un domaine ?",
          defaultOpen: true,
          content: (
            <div className="space-y-3">
              <p>
                Par defaut, vos emails sont envoyes depuis <strong className="text-zinc-200">onboarding@resend.dev</strong> — un domaine partage. Vos emails risquent d&apos;arriver en spam car Gmail et les autres fournisseurs ne font pas confiance a ce domaine.
              </p>
              <p>
                En configurant <strong className="text-zinc-200">votre propre domaine</strong> (ex: <code className="text-orange-400">newsletter.votresite.com</code>), vous :
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ameliorez votre <strong className="text-zinc-200">delivrabilite</strong> (moins de spam)</li>
                <li>Renforcez votre <strong className="text-zinc-200">image de marque</strong> (emails de contact@votresite.com)</li>
                <li>Protegez votre <strong className="text-zinc-200">reputation</strong> d&apos;expediteur</li>
                <li>Respectez les exigences de Google/Yahoo (SPF + DKIM obligatoires depuis 2024)</li>
              </ul>
            </div>
          ),
        },
        {
          title: "Etape 1 : Choisir votre domaine ou sous-domaine",
          content: (
            <div className="space-y-3">
              <p>
                Vous pouvez utiliser votre domaine principal (<code className="text-orange-400">votresite.com</code>) ou un sous-domaine dedie (<code className="text-orange-400">mail.votresite.com</code> ou <code className="text-orange-400">newsletter.votresite.com</code>).
              </p>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                <p className="text-amber-400 text-xs font-medium mb-1">Recommandation</p>
                <p className="text-xs">
                  Utilisez un <strong>sous-domaine</strong> (ex: <code>mail.votresite.com</code>) pour isoler la reputation de vos emails marketing de votre domaine principal. Si votre domaine principal a deja des DNS complexes, un sous-domaine est plus simple a configurer.
                </p>
              </div>
              <StepList steps={[
                "Decidez du domaine ou sous-domaine a utiliser",
                "Cliquez sur « Ajouter un domaine » en haut de cette page",
                "Entrez le domaine complet (ex: mail.votresite.com)",
                "MailPulse va generer les enregistrements DNS a configurer",
              ]} />
            </div>
          ),
        },
        {
          title: "Etape 2 : Configurer les DNS chez votre fournisseur",
          content: (
            <div className="space-y-3">
              <p>
                Apres avoir ajoute votre domaine, MailPulse affiche des <strong className="text-zinc-200">enregistrements DNS</strong> (SPF et DKIM) a ajouter chez votre <strong className="text-zinc-200">registrar</strong> (la ou vous avez achete votre domaine).
              </p>

              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-3 space-y-2">
                <p className="text-xs font-medium text-zinc-300">Qu&apos;est-ce que SPF et DKIM ?</p>
                <ul className="text-xs space-y-1">
                  <li><strong className="text-zinc-200">SPF</strong> (Sender Policy Framework) : dit aux serveurs email &laquo; ces serveurs ont le droit d&apos;envoyer des emails pour mon domaine &raquo;</li>
                  <li><strong className="text-zinc-200">DKIM</strong> (DomainKeys Identified Mail) : ajoute une signature cryptographique a vos emails pour prouver qu&apos;ils n&apos;ont pas ete modifies</li>
                </ul>
              </div>

              <p className="text-xs font-medium text-zinc-300">Ou ajouter les DNS selon votre fournisseur :</p>
              <ul className="text-xs space-y-2">
                <li><LinkOut href="https://dash.cloudflare.com">Cloudflare</LinkOut> → DNS → Ajouter un enregistrement → Type TXT ou CNAME</li>
                <li><LinkOut href="https://www.namecheap.com/myaccount/login">Namecheap</LinkOut> → Domain List → Manage → Advanced DNS → Add Record</li>
                <li><LinkOut href="https://www.ovh.com/manager/">OVH</LinkOut> → Domaines → Zone DNS → Ajouter une entree</li>
                <li><LinkOut href="https://domains.google.com">Google Domains</LinkOut> → DNS → Enregistrements personnalises</li>
                <li><LinkOut href="https://www.gandi.net/fr">Gandi</LinkOut> → Domaines → DNS Records → Ajouter</li>
              </ul>

              <StepList steps={[
                "Connectez-vous a votre registrar (Cloudflare, Namecheap, OVH...)",
                "Allez dans la section DNS / Zone DNS de votre domaine",
                "Ajoutez les enregistrements SPF (type TXT) : copiez le Nom et la Valeur depuis MailPulse",
                "Ajoutez les enregistrements DKIM (type CNAME ou TXT) : copiez le Nom et la Valeur depuis MailPulse",
                "Sauvegardez les changements. La propagation peut prendre 5 minutes a 48 heures",
              ]} />
            </div>
          ),
        },
        {
          title: "Etape 3 : Verifier votre domaine",
          content: (
            <div className="space-y-3">
              <p>
                Une fois les DNS configures, revenez sur cette page et cliquez sur le bouton <strong className="text-zinc-200">Verifier</strong> a cote de votre domaine. MailPulse va verifier que les enregistrements sont corrects.
              </p>
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-3 space-y-1">
                <p className="text-xs"><strong className="text-emerald-400">Verifie (vert)</strong> — Tout est bon, vous pouvez envoyer des emails !</p>
                <p className="text-xs"><strong className="text-blue-400">En attente (bleu)</strong> — Les DNS ne sont pas encore propages, reessayez dans quelques minutes</p>
                <p className="text-xs"><strong className="text-red-400">Echoue (rouge)</strong> — Les enregistrements sont incorrects ou manquants, verifiez vos DNS</p>
              </div>
              <p>
                Si la verification echoue apres 48h, verifiez que vous avez copie les valeurs <strong className="text-zinc-200">exactement</strong> comme affichees (pas d&apos;espace en trop, pas de guillemets autour de la valeur TXT).
              </p>
            </div>
          ),
        },
        {
          title: "FAQ",
          content: (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-zinc-300">Je n&apos;ai pas de domaine, comment en obtenir un ?</p>
                <p className="text-xs mt-1">
                  Achetez un domaine chez un registrar comme <LinkOut href="https://www.namecheap.com">Namecheap</LinkOut>, <LinkOut href="https://www.ovh.com">OVH</LinkOut>, ou <LinkOut href="https://www.cloudflare.com/products/registrar/">Cloudflare</LinkOut> (a partir de ~5 000 FCFA/an). Utilisez ensuite un sous-domaine dedie pour l&apos;email marketing.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Puis-je utiliser un domaine gratuit (Gmail, Yahoo) ?</p>
                <p className="text-xs mt-1">
                  Non. Les fournisseurs gratuits ne permettent pas de configurer les DNS. Vous devez posseder votre propre domaine.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Combien de temps prend la propagation DNS ?</p>
                <p className="text-xs mt-1">
                  Generalement 5 a 30 minutes. Dans de rares cas, cela peut prendre jusqu&apos;a 48 heures. Cloudflare est souvent le plus rapide (quelques minutes).
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Je peux envoyer sans domaine verifie ?</p>
                <p className="text-xs mt-1">
                  Oui, mais uniquement depuis <code className="text-orange-400">onboarding@resend.dev</code>. Vos emails auront moins de chances d&apos;arriver en boite de reception. C&apos;est acceptable pour tester, pas pour envoyer en production.
                </p>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
