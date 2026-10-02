"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Gauge, MoreHorizontal, Phone, Plus, QrCode, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  renameProviderAccount,
  setDefaultProviderAccount,
  setProviderAccountActive,
} from "../../settings/external-applications/baileys-actions";
import { WhatsAppPairingDialog } from "../../settings/external-applications/whatsapp-pairing-dialog";

export type NumberView = {
  id: string;
  label: string;
  named: boolean;
  transport: "BAILEYS" | "META";
  active: boolean;
  /** The number that leaves when a request names none. */
  speaking: boolean;
  /** End of the 30-day tighter rate after a QR pairing, ISO; null once over. */
  warmupUntil: string | null;
};

export type ApplicationNumbers = {
  id: string;
  key: string;
  name: string;
  blocked: boolean;
  numbers: NumberView[];
};

type ActionResult = { success?: boolean; error?: string } | { error: string };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

export function NumbersClient({
  applications,
  organizationNumber,
  canManage,
  planAllows,
  pairingAvailable,
}: {
  applications: ApplicationNumbers[];
  organizationNumber: { enabled: boolean; connected: boolean; mode: string };
  canManage: boolean;
  planAllows: boolean;
  pairingAvailable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pairing, setPairing] = useState<{ applicationId: string; replaceAccountId: string | null } | null>(null);
  const [renaming, setRenaming] = useState<{ applicationId: string; number: NumberView } | null>(null);

  function run(action: () => Promise<ActionResult>, success: string) {
    startTransition(async () => {
      const result = await action();
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  const totalNumbers = applications.reduce((count, application) => count + application.numbers.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-balance text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Numéros WhatsApp</h1>
        <p className="max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Chaque application envoie depuis ses propres numéros, jamais depuis ceux d&apos;une autre. Le numéro par
          défaut part quand l&apos;envoi n&apos;en précise aucun ; une requête API peut en choisir un autre avec{" "}
          <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">sender_id</code>.
        </p>
      </div>

      {!planAllows ? (
        <p className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          WhatsApp est disponible avec le plan Pro.
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Phone className="size-4 text-zinc-500" />
            </span>
            <div>
              <p className="font-medium text-zinc-950 dark:text-zinc-50">Numéro de l&apos;organisation</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Utilisé par les envois du tableau de bord et par les clés API sans application.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={organizationNumber.enabled && organizationNumber.connected ? "default" : "secondary"}>
              {!organizationNumber.enabled ? "Non activé" : organizationNumber.connected ? "Connecté" : "À connecter"}
            </Badge>
            <Button asChild variant="outline" className="h-11">
              <Link href="/dashboard/messaging">Gérer</Link>
            </Button>
          </div>
        </div>
      </section>

      {applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <p className="font-medium text-zinc-950 dark:text-zinc-50">Aucune application externe</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            Créez une application par école ou par marque : chacune reçoit ses propres numéros et ses clés API.
          </p>
          <Button asChild className="mt-4 h-11">
            <Link href="/dashboard/settings/external-applications">Créer une application</Link>
          </Button>
        </div>
      ) : null}

      {applications.map((application) => (
        <section key={application.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800">
          <header className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
            <div>
              <p className="font-medium text-zinc-950 dark:text-zinc-50">{application.name}</p>
              <p className="font-mono text-xs text-zinc-500">{application.key}</p>
            </div>
            {canManage ? (
              <Button
                className="h-11"
                disabled={!pairingAvailable || pending}
                title={pairingAvailable ? undefined : "Le service WhatsApp n'est pas configuré sur cette instance."}
                onClick={() => setPairing({ applicationId: application.id, replaceAccountId: null })}
              >
                <Plus className="size-4" />
                Ajouter un numéro
              </Button>
            ) : null}
          </header>

          {application.blocked ? (
            <p className="border-b border-zinc-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-zinc-800 dark:bg-red-950/40 dark:text-red-300">
              Aucun numéro ne peut partir : choisissez un numéro par défaut ou réactivez-en un.
            </p>
          ) : null}

          {application.numbers.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
              Aucun numéro : les messages de cette application partent du numéro de l&apos;organisation.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {application.numbers.map((number) => (
                <li key={number.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={number.active ? "font-medium text-zinc-950 dark:text-zinc-50" : "font-medium text-zinc-400"}>
                        {number.label}
                      </span>
                      {number.speaking ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                          <Star className="size-3" />
                          Par défaut
                        </span>
                      ) : null}
                      {!number.active ? <Badge variant="secondary">Désactivé</Badge> : null}
                      <Badge variant="outline">{number.transport === "META" ? "API Meta" : "WhatsApp Web"}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {number.warmupUntil ? (
                        <span className="inline-flex items-center gap-1">
                          <Gauge className="size-3.5" />
                          Rodage jusqu&apos;au {dateFormat.format(new Date(number.warmupUntil))} : envoi de codes ralenti
                        </span>
                      ) : null}
                      <button
                        type="button"
                        className="inline-flex min-h-8 items-center gap-1 font-mono hover:text-orange-500"
                        onClick={async () => {
                          await navigator.clipboard.writeText(number.id).catch(() => {});
                          toast.success("Identifiant copié");
                        }}
                        title="Identifiant à passer en sender_id"
                      >
                        <Copy className="size-3.5" />
                        {number.id}
                      </button>
                    </div>
                  </div>

                  {canManage ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="size-11 shrink-0 self-end sm:self-auto" aria-label={`Actions pour ${number.label}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!number.speaking && number.active ? (
                          <DropdownMenuItem
                            onSelect={() => run(() => setDefaultProviderAccount(application.id, number.id), "Numéro par défaut changé")}
                          >
                            <Star className="size-4" />
                            Définir par défaut
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onSelect={() => setRenaming({ applicationId: application.id, number })}>
                          Renommer
                        </DropdownMenuItem>
                        {number.transport === "BAILEYS" ? (
                          <DropdownMenuItem
                            disabled={!pairingAvailable}
                            onSelect={() => setPairing({ applicationId: application.id, replaceAccountId: number.id })}
                          >
                            <QrCode className="size-4" />
                            Remplacer le téléphone
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={number.active ? "text-red-600 focus:text-red-600" : undefined}
                          onSelect={() =>
                            run(
                              () => setProviderAccountActive(application.id, number.id, !number.active),
                              number.active ? "Numéro désactivé" : "Numéro réactivé",
                            )
                          }
                        >
                          {number.active ? "Désactiver" : "Réactiver"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {totalNumbers > 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Un numéro relié par QR code depuis moins de 30 jours envoie ses codes de vérification à un rythme réduit,
          pour limiter le risque de blocage par WhatsApp.
        </p>
      ) : null}

      {pairing ? (
        <WhatsAppPairingDialog
          applicationId={pairing.applicationId}
          replaceAccountId={pairing.replaceAccountId}
          onClose={() => setPairing(null)}
        />
      ) : null}

      {renaming ? (
        <RenameDialog
          number={renaming.number}
          onClose={() => setRenaming(null)}
          onSave={(label) => {
            const target = renaming;
            setRenaming(null);
            run(() => renameProviderAccount(target.applicationId, target.number.id, label), "Numéro renommé");
          }}
        />
      ) : null}
    </div>
  );
}

function RenameDialog({ number, onClose, onSave }: { number: NumberView; onClose: () => void; onSave: (label: string) => void }) {
  const [label, setLabel] = useState(number.named ? number.label : "");
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(label);
          }}
        >
          <DialogHeader>
            <DialogTitle>Renommer le numéro</DialogTitle>
            <DialogDescription>
              Le nom que les équipes reconnaissent (« Scolarité Yakro »). Vide, le numéro s&apos;affiche masqué.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-2">
            <Label htmlFor="number-label">Nom</Label>
            <Input id="number-label" value={label} maxLength={60} onChange={(event) => setLabel(event.target.value)} autoFocus className="h-11" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="h-11">
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
