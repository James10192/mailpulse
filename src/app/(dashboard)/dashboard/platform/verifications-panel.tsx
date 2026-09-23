import { KeyRound, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { maskE164 } from "@/lib/phone-numbers";
import type { PhoneVerificationError, PhoneVerificationStatus } from "@/generated/prisma";
import { effectiveStatus, VERIFICATION_MAX_ATTEMPTS } from "@/lib/verifications/policy";

const RECENT_LIMIT = 50;
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

const STATUS: Record<PhoneVerificationStatus, { label: string; variant: "success" | "destructive" | "warning" | "secondary" }> = {
  PENDING: { label: "En attente", variant: "warning" },
  APPROVED: { label: "Validée", variant: "success" },
  EXPIRED: { label: "Expirée", variant: "secondary" },
  MAX_ATTEMPTS: { label: "Tentatives épuisées", variant: "destructive" },
  CANCELED: { label: "Remplacée", variant: "secondary" },
  FAILED: { label: "Échec d'envoi", variant: "destructive" },
};

const SEND_ERRORS: Record<PhoneVerificationError, string> = {
  RECIPIENT_UNREACHABLE: "Numéro sans compte WhatsApp",
  REJECTED: "Envoi refusé par le fournisseur",
  TIMEOUT: "Envoi non confirmé : délai dépassé",
  TRANSPORT: "Envoi non confirmé : erreur du fournisseur",
};

async function loadVerifications(organizationId: string) {
  try {
    const rows = await prisma.phoneVerification.findMany({
      where: { organizationId },
      // The code hash is deliberately never selected: the dashboard has no use for it.
      select: {
        id: true, phoneNumber: true, reference: true, status: true, attempts: true, expiresAt: true,
        createdAt: true, errorCode: true, apiKey: { select: { name: true, revokedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
    });
    return { ok: true as const, rows };
  } catch (error) {
    console.error("[platform] phone verifications could not be loaded", { organizationId, error: error instanceof Error ? error.message : error });
    return { ok: false as const };
  }
}

/** Codes sent through the verification API. Numbers are masked; codes are never shown, they are not even stored. */
export async function VerificationsPanel({ organizationId }: { organizationId: string }) {
  const result = await loadVerifications(organizationId);
  const now = new Date();

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />Vérifications de numéro</CardTitle>
        <CardDescription>Les {RECENT_LIMIT} derniers codes envoyés par WhatsApp via l&apos;API. Le code lui-même n&apos;est jamais conservé ni affiché.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {!result.ok ? (
          <p role="alert" className="border-t px-6 py-10 text-center text-sm text-destructive">Impossible de charger les vérifications. Rechargez la page dans un instant.</p>
        ) : (
          <div className="overflow-x-auto border-t border-zinc-200 dark:border-zinc-800">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Envoyé par</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Tentatives</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                      Aucune vérification pour l&apos;instant. Elles apparaîtront ici dès le premier appel à <span className="font-mono">POST /api/v1/verifications</span>.
                    </TableCell>
                  </TableRow>
                ) : result.rows.map((row) => {
                  const status = STATUS[effectiveStatus(row, now)];
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm">{maskE164(row.phoneNumber)}</TableCell>
                      <TableCell className="max-w-44 truncate text-sm text-muted-foreground" title={row.reference ?? undefined}>{row.reference ?? "Aucune"}</TableCell>
                      <TableCell>
                        {row.apiKey ? (
                          <span className="inline-flex max-w-48 items-center gap-1.5 text-sm" title={row.apiKey.revokedAt ? `${row.apiKey.name} (clé révoquée depuis)` : row.apiKey.name}>
                            <KeyRound className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="truncate">{row.apiKey.name}</span>
                          </span>
                        ) : <span className="text-sm text-muted-foreground">Clé supprimée</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {row.errorCode ? <p className="mt-1 max-w-56 truncate text-xs text-destructive">{SEND_ERRORS[row.errorCode]}</p> : null}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">{row.attempts}/{VERIFICATION_MAX_ATTEMPTS}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dateFormatter.format(row.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
