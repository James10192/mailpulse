"use client";

import { useState } from "react";
import { LayoutTemplate, Loader2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toggleTemplateConfig, upsertTemplateConfig } from "./endpoint-actions";
import type { TemplateConfigView } from "./types";

export function TemplateConfigsSection({
  applicationId,
  configs,
  canManage,
}: {
  applicationId: string;
  configs: TemplateConfigView[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [operationKey, setOperationKey] = useState("");
  const [locale, setLocale] = useState("fr");
  const [providerTemplateId, setProviderTemplateId] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setOperationKey("");
      setLocale("fr");
      setProviderTemplateId("");
      setError("");
      setPending(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    const result = await upsertTemplateConfig(applicationId, { operationKey, locale, providerTemplateId });
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    handleOpenChange(false);
  }

  async function toggle(config: TemplateConfigView, active: boolean) {
    setListError("");
    setPendingId(config.id);
    const result = await toggleTemplateConfig(config.id, active);
    setPendingId("");
    if ("error" in result && result.error) setListError(result.error);
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <LayoutTemplate className="h-4 w-4 text-zinc-400" />
          Templates WhatsApp
        </h3>
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Associer
          </Button>
        ) : null}
      </div>

      {listError ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{listError}</p> : null}

      <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {configs.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Aucun template associé. Reliez une opération métier à un template Meta approuvé.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opération</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Template Meta</TableHead>
                <TableHead className="text-right">Actif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-mono text-xs">
                    {config.operationKey}
                    {config.scopedToProviderAccount ? (
                      <Badge variant="secondary" className="ml-2">
                        Compte spécifique
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{config.locale}</TableCell>
                  <TableCell className="font-mono text-xs">{config.providerTemplateId}</TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <Switch
                        checked={config.active}
                        disabled={pendingId === config.id}
                        onCheckedChange={(checked) => toggle(config, checked)}
                        aria-label={`Activer le template ${config.operationKey}`}
                      />
                    ) : (
                      <Badge variant={config.active ? "success" : "secondary"}>
                        {config.active ? "Actif" : "Inactif"}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Associer un template</DialogTitle>
              <DialogDescription>
                Relie une opération métier de l&apos;application à un template Meta approuvé pour une locale. Une
                association existante (opération + locale) est mise à jour.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor={`operation-${applicationId}`}>Clé d&apos;opération</Label>
              <Input
                id={`operation-${applicationId}`}
                value={operationKey}
                onChange={(event) => setOperationKey(event.target.value.toLowerCase())}
                placeholder="payment.reminder"
                required
                className="font-mono"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`locale-${applicationId}`}>Locale</Label>
                <Input
                  id={`locale-${applicationId}`}
                  value={locale}
                  onChange={(event) => setLocale(event.target.value)}
                  placeholder="fr ou fr_FR"
                  required
                  pattern="[a-z]{2}(_[A-Z]{2})?"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`template-${applicationId}`}>Template Meta</Label>
                <Input
                  id={`template-${applicationId}`}
                  value={providerTemplateId}
                  onChange={(event) => setProviderTemplateId(event.target.value)}
                  placeholder="rappel_paiement_v2"
                  required
                  className="font-mono"
                />
              </div>
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
