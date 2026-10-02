"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRightLeft, Copy, Gauge, MoreHorizontal, Phone, Plus, QrCode, Star } from "lucide-react";

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
  moveProviderAccount,
  type OpenSendView,
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

// UTC on both sides: the server renders in UTC, a reader in Benin (UTC+1) must see the same day.
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

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
  const [moving, setMoving] = useState<{ applicationId: string; number: NumberView } | null>(null);

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
                        {applications.length > 1 ? (
                          <DropdownMenuItem onSelect={() => setMoving({ applicationId: application.id, number })}>
                            <ArrowRightLeft className="size-4" />
                            Déplacer vers une autre application
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

      {moving ? (
        <MoveDialog
          sourceApplicationId={moving.applicationId}
          number={moving.number}
          targets={applications.filter((candidate) => candidate.id !== moving.applicationId)}
          onClose={() => setMoving(null)}
          onMoved={(message) => {
            setMoving(null);
            toast.success(message);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

const OPEN_SEND_LABEL: Record<string, string> = {
  PENDING: "pas encore parti",
  QUEUED: "en file d'attente",
  CONSENT_PENDING: "attend l'accord du destinataire",
  PROCESSING: "bloqué en cours d'envoi",
  SUBMISSION_UNKNOWN: "à l'issue inconnue",
};

/** Same kind, same state: one line with a count and the oldest date. */
function groupOpenSends(sends: OpenSendView[]) {
  const groups = new Map<string, { label: string; detail: string | null; count: number; oldest: string }>();
  for (const send of sends) {
    const label = send.kind === "consent" ? "Demande d'accord sans réponse" : `Envoi ${OPEN_SEND_LABEL[send.status] ?? send.status.toLowerCase()}`;
    const key = `${label}|${send.operationKey ?? ""}`;
    const group = groups.get(key);
    if (group) {
      group.count += 1;
      if (send.createdAt < group.oldest) group.oldest = send.createdAt;
    } else {
      groups.set(key, { label, detail: send.operationKey, count: 1, oldest: send.createdAt });
    }
  }
  return [...groups.values()];
}

function MoveDialog({
  sourceApplicationId,
  number,
  targets,
  onClose,
  onMoved,
}: {
  sourceApplicationId: string;
  number: NumberView;
  targets: ApplicationNumbers[];
  onClose: () => void;
  onMoved: (message: string) => void;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState<OpenSendView[] | null>(null);
  const [pending, startTransition] = useTransition();
  const target = targets.find((candidate) => candidate.id === targetId) ?? null;

  function submit(stopOpenSends: boolean) {
    if (!target) return;
    startTransition(async () => {
      const result = await moveProviderAccount(sourceApplicationId, number.id, target.id, stopOpenSends);
      if ("busy" in result) {
        setBusy(result.busy);
        return;
      }
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      onMoved(
        result.stopped > 0
          ? `Numéro déplacé vers ${target.name}, ${result.stopped} envoi${result.stopped > 1 ? "s" : ""} arrêté${result.stopped > 1 ? "s" : ""}`
          : `Numéro déplacé vers ${target.name}`,
      );
    });
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(busy !== null);
          }}
        >
          <DialogHeader>
            <DialogTitle>Déplacer « {number.label} »</DialogTitle>
            <DialogDescription>
              Le numéro enverra pour l&apos;application choisie et ses réponses y arriveront. Les refus déjà reçus
              (STOP) le suivent ; l&apos;historique des envois reste dans l&apos;application actuelle.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="my-4 space-y-2" disabled={pending}>
            <legend className="mb-2 text-sm font-medium text-zinc-950 dark:text-zinc-50">Application de destination</legend>
            {targets.map((candidate) => (
              <label
                key={candidate.id}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                  candidate.id === targetId
                    ? "border-orange-500 bg-orange-500/10"
                    : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="move-target"
                    value={candidate.id}
                    checked={candidate.id === targetId}
                    onChange={() => setTargetId(candidate.id)}
                    className="accent-orange-500"
                  />
                  <span>
                    <span className="block font-medium text-zinc-950 dark:text-zinc-50">{candidate.name}</span>
                    <span className="block font-mono text-xs text-zinc-500">{candidate.key}</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs text-zinc-500">{activeCountLabel(candidate.numbers)}</span>
              </label>
            ))}
          </fieldset>
          {target && !busy ? (
            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
              {!number.active
                ? "Le numéro reste désactivé après le déplacement."
                : target.numbers.some((candidate) => candidate.active)
                  ? `${target.name} garde son numéro par défaut ; celui-ci s'ajoute à côté.`
                  : `Ce sera le numéro par défaut de ${target.name}.`}
              {number.speaking ? " L'application actuelle passe sur un autre de ses numéros, s'il en reste." : ""}
            </p>
          ) : null}
          {busy ? (
            <div className="mb-4 space-y-3 rounded-lg border border-orange-500/40 bg-orange-500/5 p-3 text-sm">
              <p className="font-medium text-zinc-950 dark:text-zinc-50">
                {busy.length} envoi{busy.length > 1 ? "s" : ""} de ce numéro n&apos;{busy.length > 1 ? "ont" : "a"} pas abouti
              </p>
              <ul className="space-y-1.5">
                {groupOpenSends(busy).map((group) => (
                  <li key={`${group.label}|${group.detail}`} className="flex flex-wrap items-baseline justify-between gap-x-3 text-zinc-600 dark:text-zinc-300">
                    <span>
                      {group.count > 1 ? `${group.count} × ` : ""}
                      {group.label}
                      {group.detail ? <span className="ml-1 font-mono text-xs text-zinc-500">{group.detail}</span> : null}
                    </span>
                    <span className="text-xs text-zinc-500">depuis le {dateFormat.format(new Date(group.oldest))}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Les arrêter : ce qui n&apos;est pas parti est annulé et l&apos;application en est prévenue ; un envoi à
                l&apos;issue inconnue est clos sans être renvoyé.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" className="h-11" disabled={!target || pending}>
              {pending ? "Déplacement…" : busy ? "Arrêter ces envois et déplacer" : "Déplacer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function activeCountLabel(numbers: NumberView[]) {
  const active = numbers.filter((number) => number.active).length;
  if (active > 0) return `${active} numéro${active > 1 ? "s" : ""} actif${active > 1 ? "s" : ""}`;
  return numbers.length === 0 ? "Aucun numéro" : "Aucun numéro actif";
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
