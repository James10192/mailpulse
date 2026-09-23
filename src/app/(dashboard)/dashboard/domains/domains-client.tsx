"use client";

import { useActionState, useState } from "react";
import { Plus, Globe, CheckCircle, Clock, Trash2, Info, RefreshCw, Copy, Check, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { createDomain, deleteDomain, verifyDomain } from "./actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { HelpModal, HelpButton, StepList, LinkOut } from "@/components/dashboard/help-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  region: string;
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
            Configurez et vérifiez vos domaines d&apos;envoi
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un domaine
        </Button>
      </div>

      <Alert className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <AlertDescription className="text-zinc-600 dark:text-zinc-400">
            Ajoutez votre domaine puis configurez les enregistrements DNS chez votre fournisseur. Cliquez sur &laquo; Comment configurer ? &raquo; pour un guide détaillé pas-à-pas.
          </AlertDescription>
        </div>
        <HelpButton onClick={() => setHelpOpen(true)} />
      </Alert>

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
            Aucun domaine configuré pour le moment.
          </p>
          <Button variant="link" onClick={() => setOpen(true)} className="h-auto p-0">
            Ajouter votre premier domaine
          </Button>
        </div>
      )}

      {/* Create modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un domaine</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="domain-name">Domaine</Label>
              <Input
                id="domain-name"
                name="domain"
                required
                className="h-10 font-mono"
                placeholder="ex: mail.mondomaine.com"
              />
            </div>
            {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer ce domaine ?"
        message="Le domaine sera supprimé de Resend et de MailPulse. Cette action est irréversible."
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
  const dnsRecords = buildDnsRecords(domain);

  async function handleVerify() {
    setVerifying(true);
    await verifyDomain(domain.id);
    setVerifying(false);
  }

  const statusBadge = domain.verified ? (
    <Badge variant="success" className="text-xs">
      <CheckCircle />
      Vérifié
    </Badge>
  ) : domain.status === "pending" ? (
    <Badge variant="secondary" className="text-xs">
      <Clock />
      Vérification en cours
    </Badge>
  ) : domain.status === "failed" ? (
    <Badge variant="destructive" className="text-xs">
      <AlertTriangle />
      Échoué
    </Badge>
  ) : (
    <Badge variant="warning" className="text-xs">
      <Clock />
      En attente
    </Badge>
  );

  function toggleExpanded() {
    setExpanded(!expanded);
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
      {/* The header is a div, not a button: it contains the verify/delete buttons. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/35"
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpanded();
          }
        }}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
          <span className="text-sm font-mono font-medium text-zinc-900 dark:text-zinc-100">{domain.domain}</span>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2">
          {!domain.verified && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleVerify(); }}
              disabled={verifying}
              className="h-8 gap-1.5 text-orange-500 hover:text-orange-500 dark:text-orange-500 dark:hover:text-orange-500 [&_svg]:size-3"
            >
              <RefreshCw className={verifying ? "animate-spin" : ""} />
              Vérifier
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={deleting}
            aria-label={`Supprimer le domaine ${domain.domain}`}
            className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-500 [&_svg]:size-3.5"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {expanded && dnsRecords.length > 0 && (
        <div className="px-5 pb-5 border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-4">
          <p className="text-xs text-zinc-500">
            Ajoutez ces enregistrements DNS chez votre fournisseur, puis cliquez sur Vérifier. Dans cPanel, utilisez le champ Nom tel qu&apos;affiché ici.
          </p>

          {dnsRecords.map((record) => (
            <DnsRecord key={`${record.label}-${record.type}-${record.name}`} {...record} />
          ))}
        </div>
      )}
    </div>
  );
}

function buildDnsRecords(domain: DomainData) {
  const region = domain.region || "us-east-1";
  const storedSpf = domain.spfRecord?.replace(/^"|"$/g, "") ?? "";
  const spfTxtValue = storedSpf.startsWith("v=spf1") ? storedSpf : "v=spf1 include:amazonses.com ~all";
  const mxValue = storedSpf.startsWith("feedback-smtp.") ? storedSpf : `feedback-smtp.${region}.amazonses.com`;
  const dkimName = normalizeDnsName(domain.dkimName || "resend._domainkey", domain.domain);

  return [
    {
      label: "MX",
      type: "MX",
      name: "send",
      fqdn: `send.${domain.domain}`,
      value: mxValue,
      status: domain.spfStatus,
      priority: "10",
      hint: "Dans cPanel, saisissez seulement send. cPanel ajoutera automatiquement votre domaine.",
    },
    {
      label: "SPF",
      type: "TXT",
      name: "send",
      fqdn: `send.${domain.domain}`,
      value: spfTxtValue,
      status: domain.spfStatus,
      hint: "Dans cPanel, saisissez seulement send. Le record complet sera send.votredomaine.",
    },
    ...(domain.dkimRecord
      ? [{
          label: "DKIM",
          type: "TXT",
          name: dkimName,
          fqdn: `${dkimName}.${domain.domain}`,
          value: domain.dkimRecord,
          status: domain.dkimStatus,
          hint: "Important : ce record est TXT, pas CNAME. Ne collez pas le domaine si cPanel l'ajoute automatiquement.",
        }]
      : []),
  ];
}

function normalizeDnsName(name: string, domain: string) {
  const cleanName = name.replace(/\.$/, "");
  const cleanDomain = domain.replace(/\.$/, "");
  return cleanName.endsWith(`.${cleanDomain}`) ? cleanName.slice(0, -(cleanDomain.length + 1)) : cleanName;
}

function DnsRecord({
  label,
  type,
  name,
  value,
  status,
  priority,
  hint,
  fqdn,
}: {
  label: string;
  type: string;
  name: string;
  value: string;
  status: string | null;
  priority?: string;
  hint?: string;
  fqdn?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(field);
        toast.success("Copié.");
        setTimeout(() => setCopied(null), 2000);
      },
      () => toast.error("Impossible de copier."),
    );
  }

  const statusIcon = status === "verified" ? (
    <CheckCircle className="h-3 w-3 text-emerald-500" />
  ) : status === "failed" ? (
    <AlertTriangle className="h-3 w-3 text-red-500" />
  ) : (
    <Clock className="h-3 w-3 text-amber-500" />
  );

  const rows: { key: string; caption: string; text: string; copyLabel: string }[] = [
    { key: "name", caption: "Nom", text: name, copyLabel: `Copier le nom ${label}` },
    ...(fqdn ? [{ key: "fqdn", caption: "Final", text: fqdn, copyLabel: `Copier le nom complet ${label}` }] : []),
    ...(priority ? [{ key: "priority", caption: "Prio.", text: priority, copyLabel: `Copier la priorité ${label}` }] : []),
    { key: "value", caption: "Valeur", text: value, copyLabel: `Copier la valeur ${label}` },
  ];

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
          <Badge variant="secondary" className="rounded px-1.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-400">{type}</Badge>
          {statusIcon}
        </div>
      </div>
      {hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
      <div className="space-y-1.5">
        {rows.map((row) => {
          const field = `${label}-${row.key}`;
          return (
            <div key={row.key} className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 w-10 shrink-0">{row.caption}</span>
              <code className="flex-1 text-xs font-mono text-zinc-300 bg-zinc-900 px-2 py-1 rounded truncate">{row.text}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copy(row.text, field)}
                aria-label={row.copyLabel}
                className="h-6 w-6 text-zinc-400 [&_svg]:size-3"
              >
                {copied === field ? <Check className="text-emerald-500" /> : <Copy />}
              </Button>
            </div>
          );
        })}
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
      subtitle="Guide complet pas-à-pas"
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
                "Ajoutez le record MX : type MX, nom send, valeur feedback-smtp, priorité 10",
                "Ajoutez le record SPF : type TXT, nom send, valeur v=spf1 include:amazonses.com ~all",
                "Ajoutez le record DKIM : type TXT, nom resend._domainkey, valeur qui commence par p=",
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
                <p className="text-xs"><strong className="text-emerald-400">Vérifié (vert)</strong> — Tout est bon, vous pouvez envoyer des emails !</p>
                <p className="text-xs"><strong className="text-zinc-300">Vérification en cours (gris)</strong> — Les DNS ne sont pas encore propages, reessayez dans quelques minutes</p>
                <p className="text-xs"><strong className="text-red-400">Échoué (rouge)</strong> — Les enregistrements sont incorrects ou manquants, verifiez vos DNS</p>
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
