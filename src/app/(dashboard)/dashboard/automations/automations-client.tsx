"use client";

import { useState, useActionState } from "react";
import { Plus, Zap, Trash2, PauseCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createAutomation, deleteAutomation, updateAutomationStatus } from "./actions";
import { cn } from "@/lib/utils";
import { LimitWarningBanner } from "@/components/dashboard/feature-gate";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { FormDialog } from "@/components/dashboard/form-dialog";
import { PageHint } from "@/components/dashboard/page-hint";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionState } from "@/types/action-state";

interface AutomationData {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  status: string;
  createdAt: string;
}

const triggerLabels: Record<string, string> = {
  SUBSCRIBER_ADDED: "Nouvel abonné",
  TAG_ADDED: "Tag ajouté",
  CAMPAIGN_OPENED: "Campagne ouverte",
  LINK_CLICKED: "Lien cliqué",
  DATE_BASED: "Basé sur la date",
  CUSTOM_EVENT: "Événement personnalisé",
};

const statusConfig: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
  DRAFT: { label: "Brouillon", variant: "secondary" },
  ACTIVE: { label: "Actif", variant: "success" },
  PAUSED: { label: "En pause", variant: "warning" },
  ARCHIVED: { label: "Archivé", variant: "destructive" },
};

const presets = [
  {
    name: "Série de bienvenue",
    desc: "Envoyez une séquence d'emails aux nouveaux abonnés",
    triggerLabel: "Nouvel abonné",
    triggerValue: "SUBSCRIBER_ADDED",
  },
  {
    name: "Réengagement",
    desc: "Ciblez les contacts inactifs depuis 30 jours",
    triggerLabel: "Inactivité",
    triggerValue: "DATE_BASED",
  },
  {
    name: "Anniversaire",
    desc: "Email automatique pour l'anniversaire du contact",
    triggerLabel: "Date",
    triggerValue: "DATE_BASED",
  },
];

export function AutomationsClient({
  automations,
  canCreate,
  limit,
  currentCount,
  planLabel,
  overLimit,
}: {
  automations: AutomationData[];
  canCreate: boolean;
  limit: number;
  currentCount: number;
  planLabel: string;
  overLimit: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetTrigger, setPresetTrigger] = useState("SUBSCRIBER_ADDED");
  const [presetDesc, setPresetDesc] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pausing, setPausing] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createAutomation(prev, formData);
      if (result?.success) setModalOpen(false);
      return result;
    },
    null
  );

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeleting(id);
    const result = await deleteAutomation(id);
    setDeleting(null);
    if (result?.error) toast.error(result.error);
  }

  async function handlePause(id: string) {
    setPausing(id);
    const result = await updateAutomationStatus(id, "PAUSED");
    setPausing(null);
    if (result?.error) toast.error(result.error);
  }

  return (
    <>
      <div className="space-y-6">
        {overLimit && limit !== -1 && (
          <LimitWarningBanner
            resourceLabel="automations"
            current={currentCount}
            limit={limit}
            planLabel={planLabel}
            actionLabel="Les automations en excès ont été mises en pause automatiquement. Passez au Pro pour toutes les réactiver."
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Automations
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Workflows automatisés pour vos campagnes
            </p>
          </div>
          {canCreate ? (
            <Button
              onClick={() => {
                setPresetName("");
                setPresetTrigger("SUBSCRIBER_ADDED");
                setPresetDesc("");
                setModalOpen(true);
              }}
            >
              <Plus />
              Nouvelle automation
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {currentCount}/{limit === -1 ? "∞" : limit} automations
              </span>
              <Button
                asChild
                variant="outline"
                className="text-orange-600 hover:text-orange-600 dark:text-orange-400"
              >
                <Link href="/dashboard/settings/billing">Passer au Pro</Link>
              </Button>
            </div>
          )}
        </div>

        <PageHint>
          Les automations déclenchent des séquences d&apos;emails automatiques en réponse à des événements (nouvel abonné, tag ajouté, date). Créez un workflow visuel pour définir les étapes.
        </PageHint>

        {/* Preset cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                setPresetName(preset.name);
                setPresetTrigger(preset.triggerValue);
                setPresetDesc(preset.desc);
                setModalOpen(true);
              }}
              disabled={!canCreate}
              className={cn(
                "group flex flex-col items-start rounded-xl border border-dashed bg-white p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35 disabled:opacity-50 dark:bg-transparent",
                canCreate
                  ? "border-zinc-300 hover:border-orange-500/50 dark:border-zinc-700"
                  : "border-zinc-200 dark:border-zinc-800"
              )}
            >
              <Zap className="mb-3 size-5 text-zinc-400 transition-colors group-hover:group-enabled:text-orange-500 dark:text-zinc-500" />
              <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                {preset.name}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">{preset.desc}</p>
              <Badge variant="secondary" className="mt-3">
                {preset.triggerLabel}
              </Badge>
            </button>
          ))}
        </div>

        {/* Automations list */}
        {automations.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Nom
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                      Déclencheur
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Statut
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {automations.map((auto) => {
                    const badge = statusConfig[auto.status] ?? statusConfig.DRAFT;
                    return (
                      <tr
                        key={auto.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/automations/${auto.id}/edit`}
                            className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors"
                          >
                            {auto.name}
                          </Link>
                          {auto.description && (
                            <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs">
                              {auto.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Badge variant="secondary">
                            {triggerLabels[auto.trigger] ?? auto.trigger}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 font-mono hidden md:table-cell">
                          {new Date(auto.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {overLimit && (auto.status === "ACTIVE" || auto.status === "DRAFT") && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handlePause(auto.id)}
                                disabled={pausing === auto.id}
                                className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                                title="Désactiver"
                                aria-label="Désactiver"
                              >
                                <PauseCircle />
                              </Button>
                            )}
                            <Button
                              variant="ghost-destructive"
                              size="icon-sm"
                              onClick={() => setConfirmDeleteId(auto.id)}
                              disabled={deleting === auto.id}
                              title="Supprimer"
                              aria-label="Supprimer"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
            <div className="text-zinc-500 text-sm">
              Aucune automation active. Choisissez un modèle ci-dessus ou
              créez-en une personnalisée.
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      <FormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Nouvelle automation"
        action={formAction}
        error={state?.error}
        pending={isPending}
        submit={{ label: "Créer", pendingLabel: "Création..." }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="automation-name">Nom *</Label>
          <Input
            id="automation-name"
            name="name"
            type="text"
            required
            defaultValue={presetName}
            key={`name-${presetName}`}
            placeholder="Série de bienvenue"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="automation-description">Description</Label>
          <Input
            id="automation-description"
            name="description"
            type="text"
            defaultValue={presetDesc}
            key={`desc-${presetDesc}`}
            placeholder="Description optionnelle"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="automation-trigger">Déclencheur *</Label>
          <Select
            name="trigger"
            required
            defaultValue={presetTrigger}
            key={`trigger-${presetTrigger}`}
          >
            <SelectTrigger id="automation-trigger">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(triggerLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormDialog>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer cette automation ?"
        message="Cette action est irréversible. L'automation et toutes ses étapes seront supprimées définitivement."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}
