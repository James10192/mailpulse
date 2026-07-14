"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, Clock, ExternalLink, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanReadOnlyNotice } from "@/components/dashboard/plan-read-only-notice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cancelFilonRecovery } from "./actions";
import { RecoveriesChart } from "./recoveries-chart";

type Recovery = {
  id: string;
  filonOpportunityId: string;
  clientName: string;
  clientEmail: string;
  opportunityTitle: string;
  amountDue: string;
  currency: string;
  dueDate: string;
  status: string;
  nextReminderAt: string | null;
  lastReminderAt: string | null;
  contactId: string;
};

type AutomationState = {
  dueSteps: number;
  lastRunAt: string | null;
  errors: Array<{
    id: string;
    channel: string;
    message: string;
    clientName: string;
    opportunityTitle: string;
    updatedAt: string;
  }>;
};

const statusLabels: Record<string, string> = {
  PENDING: "Préparé",
  ACTIVE: "Actif",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
  FAILED: "Erreur",
};

const statusVariants: Record<string, "filon" | "success" | "secondary" | "outline" | "destructive"> = {
  PENDING: "filon",
  ACTIVE: "success",
  COMPLETED: "secondary",
  CANCELLED: "outline",
  FAILED: "destructive",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export function RecoveriesClient({
  automation,
  recoveries,
  chartData,
  canManage,
}: {
  automation: AutomationState;
  recoveries: Recovery[];
  chartData: Array<{ status: string; count: number }>;
  canManage: boolean;
}) {
  const [cancelId, setCancelId] = useState<string | null>(null);
  const selected = recoveries.find((recovery) => recovery.id === cancelId);

  async function confirmCancel() {
    if (!cancelId) return;
    await cancelFilonRecovery(cancelId);
    setCancelId(null);
  }

  return (
    <div className="page-stack app-shell-safe">
      {!canManage ? <PlanReadOnlyNotice feature="Les séquences de recouvrement" /> : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-300">
            Filon Recovery
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Recouvrements</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sequences preparees depuis les opportunites gagnees dans Filon.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/settings/integrations">
            Configurer Filon
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline de recouvrement</CardTitle>
            <CardDescription>Vue compacte par statut MailPulse.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecoveriesChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Automatisation active
            </CardTitle>
            <CardDescription>
              GitHub Actions appelle le runner toutes les 10 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span>Relances dues</span>
                <Badge variant={automation.dueSteps > 0 ? "filon" : "outline"}>{automation.dueSteps}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span>Dernière activité</span>
                <span className="text-xs">{formatDate(automation.lastRunAt)}</span>
              </div>
            </div>
            <p>J+0 email facture, J+3 rappel doux, J+7 WhatsApp, J+10 email ferme, J+14 action humaine.</p>
            {automation.errors.length > 0 ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Erreurs récentes
                </p>
                {automation.errors.map((error) => (
                  <div key={error.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {error.clientName} · {error.channel.toLowerCase()}
                    </p>
                    <p className="mt-1 text-xs">{error.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-300">
                <Clock className="h-3.5 w-3.5" />
                Aucune erreur récente.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Opportunite</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Prochaine relance</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recoveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-zinc-500">
                    Aucun recouvrement Filon pour le moment.
                  </TableCell>
                </TableRow>
              ) : (
                recoveries.map((recovery) => (
                  <TableRow key={recovery.id}>
                    <TableCell>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{recovery.clientName}</div>
                      <div className="text-xs text-zinc-500">{recovery.clientEmail}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm">{recovery.opportunityTitle}</div>
                      <div className="font-mono text-[11px] text-zinc-400">{recovery.filonOpportunityId}</div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {Number(recovery.amountDue).toLocaleString("fr-FR")} {recovery.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[recovery.status] ?? "outline"}>
                        {statusLabels[recovery.status] ?? recovery.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(recovery.nextReminderAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Actions recouvrement">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/contacts/${recovery.contactId}`}>
                              <ExternalLink className="h-4 w-4" />
                              Ouvrir contact
                            </Link>
                          </DropdownMenuItem>
                          {canManage && recovery.status !== "CANCELLED" && recovery.status !== "COMPLETED" && (
                            <DropdownMenuItem className="text-red-600" onSelect={() => setCancelId(recovery.id)}>
                              <Ban className="h-4 w-4" />
                              Annuler séquence
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={cancelId !== null} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler ce recouvrement ?</AlertDialogTitle>
            <AlertDialogDescription>
              {selected
                ? `La sequence preparee pour ${selected.clientName} sera annulee. Les messages deja envoyes, s'il y en a plus tard, ne seront pas modifies.`
                : "La sequence preparee sera annulee."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fermer</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500" onClick={(event) => {
              event.preventDefault();
              void confirmCancel();
            }}>
              Annuler la séquence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
