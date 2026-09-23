"use client";

import { useActionState, useState } from "react";
import { Plus, Globe, CheckCircle, Clock, Trash2, RefreshCw, Copy, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { createDomain, deleteDomain, verifyDomain } from "./actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { FormDialog } from "@/components/dashboard/form-dialog";
import { DomainHelpModal } from "./domain-help-modal";
import { PageHint } from "@/components/dashboard/page-hint";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

      <PageHint onHelp={() => setHelpOpen(true)}>
        Ajoutez votre domaine puis configurez les enregistrements DNS chez votre fournisseur. Cliquez sur &laquo; Comment configurer ? &raquo; pour un guide détaillé pas-à-pas.
      </PageHint>

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
          <Button variant="link" size="inline" onClick={() => setOpen(true)}>
            Ajouter votre premier domaine
          </Button>
        </div>
      )}

      {/* Create modal */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Ajouter un domaine"
        action={formAction}
        error={state?.error}
        pending={pending}
        submit={{ label: "Ajouter", pendingLabel: "Ajout..." }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="domain-name">Domaine</Label>
          <Input
            id="domain-name"
            name="domain"
            required
            className="font-mono"
            placeholder="ex: mail.mondomaine.com"
          />
        </div>
      </FormDialog>

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

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={domain.verified ? undefined : "dns"}
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden"
    >
      <AccordionItem value="dns">
        {/* The actions sit next to the trigger, never inside it: a button cannot contain buttons. */}
        <div className="flex items-center gap-2 pr-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
          <div className="min-w-0 flex-1">
            <AccordionTrigger className="items-center rounded-none px-5 py-4 hover:no-underline focus-visible:ring-inset">
              <span className="flex min-w-0 flex-wrap items-center gap-3">
                <span className="truncate font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">{domain.domain}</span>
                {statusBadge}
              </span>
            </AccordionTrigger>
          </div>
          {!domain.verified && (
            <Button
              variant="outline-accent"
              size="sm"
              onClick={handleVerify}
              disabled={verifying}
            >
              <RefreshCw className={verifying ? "animate-spin" : ""} />
              Vérifier
            </Button>
          )}
          <Button
            variant="ghost-destructive"
            size="icon-sm"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`Supprimer le domaine ${domain.domain}`}
          >
            <Trash2 />
          </Button>
        </div>

        <AccordionContent className="space-y-4 border-t border-zinc-200 px-5 pt-4 pb-5 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">
            Ajoutez ces enregistrements DNS chez votre fournisseur, puis cliquez sur Vérifier. Dans cPanel, utilisez le champ Nom tel qu&apos;affiché ici.
          </p>

          {dnsRecords.map((record) => (
            <DnsRecord key={`${record.label}-${record.type}-${record.name}`} {...record} />
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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
                size="icon-xs"
                onClick={() => copy(row.text, field)}
                aria-label={row.copyLabel}
                className="text-zinc-500 dark:text-zinc-400"
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
