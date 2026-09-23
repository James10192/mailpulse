"use client";

import { useState, useActionState } from "react";
import { Plus, AtSign, Trash2, Info, Pencil, Star } from "lucide-react";
import { createSender, updateSender, deleteSender, setDefaultSender } from "./actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActionState } from "@/types/action-state";

interface SenderData {
  id: string;
  name: string;
  email: string;
  replyTo: string | null;
  isDefault: boolean;
  createdAt: string;
}

export function SendersClient({
  senders,
  domains,
}: {
  senders: SenderData[];
  domains: string[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [editSender, setEditSender] = useState<SenderData | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [defaulting, setDefaulting] = useState<string | null>(null);

  const [createState, createAction, isCreating] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createSender(prev, formData);
      if (result?.success) setCreateOpen(false);
      return result;
    },
    null
  );

  const [editState, editAction, isEditing] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await updateSender(prev, formData);
      if (result?.success) setEditSender(null);
      return result;
    },
    null
  );

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeleting(id);
    await deleteSender(id);
    setDeleting(null);
  }

  async function handleSetDefault(id: string) {
    setDefaulting(id);
    await setDefaultSender(id);
    setDefaulting(null);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Expéditeurs
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Gérez les adresses email utilisées pour envoyer vos campagnes
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Créer un expéditeur
          </Button>
        </div>

        <Alert className="flex items-start justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <AlertDescription className="text-zinc-600 dark:text-zinc-400">
              Pour envoyer des campagnes, configurez au moins un expéditeur. Cliquez sur &laquo; Comment configurer ? &raquo; pour en savoir plus.
            </AlertDescription>
          </div>
          <HelpButton onClick={() => setHelpOpen(true)} />
        </Alert>

        <SenderHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

        {senders.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                  <TableHead className="px-4">Nom</TableHead>
                  <TableHead className="px-4">Email</TableHead>
                  <TableHead className="px-4">Statut</TableHead>
                  <TableHead className="px-4 hidden sm:table-cell">Répondre à</TableHead>
                  <TableHead className="px-4 text-right w-20">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {senders.map((sender) => (
                  <TableRow
                    key={sender.id}
                    onClick={() => setEditSender(sender)}
                    className="cursor-pointer"
                  >
                    <TableCell className="px-4 text-sm text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <AtSign className="h-4 w-4 text-zinc-400" />
                        {sender.name}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-sm font-mono text-zinc-500">
                      {sender.email}
                    </TableCell>
                    <TableCell className="px-4 text-sm">
                      {sender.isDefault ? (
                        <Badge variant="success" className="gap-1">
                          <Star className="h-3 w-3" />
                          Par défaut
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={defaulting === sender.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(sender.id);
                          }}
                        >
                          <Star className="h-3.5 w-3.5" />
                          Définir
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="px-4 text-sm font-mono text-zinc-500 hidden sm:table-cell">
                      {sender.replyTo || "—"}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); setEditSender(sender); }}
                          className="h-8 w-8 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 dark:hover:text-orange-500 [&_svg]:size-3.5"
                          title="Modifier"
                          aria-label={`Modifier l'expéditeur ${sender.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(sender.id); }}
                          disabled={deleting === sender.id}
                          className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-500 [&_svg]:size-3.5"
                          title="Supprimer"
                          aria-label={`Supprimer l'expéditeur ${sender.name}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
            <AtSign className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Aucun expéditeur configuré. Créez votre premier expéditeur pour envoyer des campagnes.
            </p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {createOpen && (
        <SenderModal
          title="Nouvel expéditeur"
          domains={domains}
          action={createAction}
          state={createState}
          isPending={isCreating}
          onClose={() => setCreateOpen(false)}
          submitLabel="Créer"
          pendingLabel="Création..."
        />
      )}

      {/* Edit modal */}
      {editSender && (
        <SenderModal
          title="Modifier l'expéditeur"
          domains={domains}
          action={editAction}
          state={editState}
          isPending={isEditing}
          onClose={() => setEditSender(null)}
          submitLabel="Enregistrer"
          pendingLabel="Enregistrement..."
          sender={editSender}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer cet expéditeur ?"
        message="Cette action est irréversible."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}

/* ─── Sender Modal (Create / Edit) ─── */

function SenderModal({
  title,
  domains,
  action,
  state,
  isPending,
  onClose,
  submitLabel,
  pendingLabel,
  sender,
}: {
  title: string;
  domains: string[];
  action: (formData: FormData) => void;
  state: ActionState;
  isPending: boolean;
  onClose: () => void;
  submitLabel: string;
  pendingLabel: string;
  sender?: SenderData;
}) {
  // Split existing email into username + domain
  const existingParts = sender?.email.split("@") ?? ["", ""];
  const [username, setUsername] = useState(existingParts[0]);
  const [selectedDomain, setSelectedDomain] = useState(
    existingParts[1] && domains.includes(existingParts[1])
      ? existingParts[1]
      : domains[0] ?? "resend.dev"
  );

  const composedEmail = username ? `${username}@${selectedDomain}` : "";

  // The parent mounts this component only while the modal is open, so the
  // username/domain state resets on every open. Closing goes through onClose.
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="mb-2">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form action={action} className="space-y-4">
          {sender && <input type="hidden" name="id" value={sender.id} />}
          {/* Hidden composed email for the server action */}
          <input type="hidden" name="email" value={composedEmail} />

          <div className="space-y-1.5">
            <Label htmlFor="sender-name">Nom *</Label>
            <Input
              id="sender-name"
              name="name"
              type="text"
              required
              defaultValue={sender?.name ?? ""}
              placeholder="Mon Entreprise"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sender-username">Adresse email *</Label>
            <div className="flex items-center gap-0">
              <Input
                id="sender-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._+-]/g, ""))}
                required
                placeholder="contact"
                className="h-10 flex-1 rounded-r-none"
              />
              <span className="flex h-10 items-center border-y border-zinc-200 bg-zinc-100 px-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800">
                @
              </span>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger className="flex-1 rounded-l-none" aria-label="Domaine d'envoi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {domains.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {composedEmail && (
              <p className="text-xs text-zinc-500 mt-1 font-mono">{composedEmail}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sender-reply">Email de réponse (optionnel)</Label>
            <Input
              id="sender-reply"
              name="replyTo"
              type="email"
              defaultValue={sender?.replyTo ?? ""}
              placeholder="reponse@exemple.com"
              className="h-10"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !username}>
              {isPending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Sender Help Modal ─── */

function SenderHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <HelpModal
      open={open}
      onClose={onClose}
      title="Configurer un expéditeur"
      subtitle="Guide complet pas-à-pas"
      sections={[
        {
          title: "Qu'est-ce qu'un expediteur ?",
          defaultOpen: true,
          content: (
            <div className="space-y-3">
              <p>
                Un <strong className="text-zinc-200">expediteur</strong> est l&apos;adresse email qui apparait dans le champ &laquo; De &raquo; quand vos contacts recoivent votre email. C&apos;est votre identite d&apos;envoi.
              </p>
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-3">
                <p className="text-xs text-zinc-400">Exemple dans la boite de reception :</p>
                <p className="text-sm text-zinc-200 font-mono mt-1">
                  De : <strong>Mon Entreprise</strong> &lt;newsletter@monsite.com&gt;
                </p>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-zinc-200">Nom</strong> — Le nom qui s&apos;affiche (ex: &laquo; Mon Entreprise &raquo;, &laquo; Marcel de MailPulse &raquo;)</li>
                <li><strong className="text-zinc-200">Adresse email</strong> — L&apos;adresse d&apos;envoi (ex: newsletter@monsite.com)</li>
                <li><strong className="text-zinc-200">Email de reponse</strong> — Ou arrivent les reponses des destinataires (optionnel, par defaut c&apos;est l&apos;adresse d&apos;envoi)</li>
              </ul>
            </div>
          ),
        },
        {
          title: "Lien avec les domaines",
          content: (
            <div className="space-y-3">
              <p>
                L&apos;adresse email de l&apos;expediteur doit utiliser un <strong className="text-zinc-200">domaine verifie</strong>. Si vous n&apos;avez pas de domaine verifie, vous ne pouvez utiliser que <code className="text-orange-400">onboarding@resend.dev</code> (domaine de test).
              </p>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                <p className="text-amber-400 text-xs font-medium mb-1">Important</p>
                <p className="text-xs">
                  Si vous avez verifie le domaine <code>mail.monsite.com</code>, vous pouvez creer des expediteurs avec n&apos;importe quel prefixe : <code>newsletter@mail.monsite.com</code>, <code>contact@mail.monsite.com</code>, <code>info@mail.monsite.com</code>, etc.
                </p>
              </div>
              <StepList steps={[
                "D'abord, configurez votre domaine dans la section Envoi → Domaines",
                "Attendez que la verification soit terminee (coche verte)",
                "Revenez ici pour creer un expediteur avec ce domaine",
                "Le domaine verifie apparaitra dans le selecteur @ lors de la creation",
              ]} />
            </div>
          ),
        },
        {
          title: "Comment creer un expediteur",
          content: (
            <div className="space-y-3">
              <StepList steps={[
                "Cliquez sur « Creer un expediteur » en haut de la page",
                "Remplissez le Nom (ex: « Mon Entreprise »). C'est ce que vos contacts verront",
                "Tapez le prefixe email (la partie avant @). Ex: newsletter, contact, info",
                "Selectionnez le domaine dans le menu deroulant (vos domaines verifies + resend.dev)",
                "Optionnel : ajoutez un email de reponse si les reponses doivent aller a une autre adresse",
                "Cliquez sur « Creer ». Votre expediteur est pret a etre utilise dans les campagnes !",
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
                  <strong className="text-zinc-200">Utilisez un nom reconnaissable</strong> — Vos contacts doivent immediatement savoir qui leur ecrit. &laquo; Mon Entreprise &raquo; est mieux que &laquo; Marketing Team &raquo;
                </li>
                <li>
                  <strong className="text-zinc-200">Separrez les types d&apos;emails</strong> — Creez plusieurs expediteurs : <code className="text-orange-400">newsletter@</code> pour le marketing, <code className="text-orange-400">info@</code> pour les transactionnels, <code className="text-orange-400">equipe@</code> pour le support
                </li>
                <li>
                  <strong className="text-zinc-200">Configurez l&apos;email de reponse</strong> — Si vous envoyez depuis <code>newsletter@</code> mais voulez recevoir les reponses sur <code>support@</code>, remplissez le champ &laquo; Email de reponse &raquo;
                </li>
                <li>
                  <strong className="text-zinc-200">Evitez les adresses noreply@</strong> — Les emails avec &laquo; noreply &raquo; ont un taux d&apos;engagement plus faible et nuisent a votre reputation d&apos;expediteur
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
                <p className="text-xs font-medium text-zinc-300">Puis-je utiliser mon adresse Gmail/Yahoo comme expediteur ?</p>
                <p className="text-xs mt-1">
                  Non. Gmail et Yahoo ne permettent pas a des services tiers d&apos;envoyer en leur nom. Vous devez utiliser votre propre domaine ou <code className="text-orange-400">onboarding@resend.dev</code> pour les tests.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Combien d&apos;expediteurs puis-je creer ?</p>
                <p className="text-xs mt-1">
                  Autant que necessaire. Il n&apos;y a pas de limite sur le nombre d&apos;expediteurs. Chaque expediteur doit utiliser un domaine verifie.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Qu&apos;est-ce que resend.dev ?</p>
                <p className="text-xs mt-1">
                  <code>resend.dev</code> est un domaine de test fourni par Resend. Il fonctionne pour les tests mais les emails envoyes depuis ce domaine ont une delivrabilite limitee et portent la mention &laquo; via resend.dev &raquo; dans Gmail.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Je ne vois pas mon domaine dans le selecteur ?</p>
                <p className="text-xs mt-1">
                  Seuls les domaines <strong>verifies</strong> apparaissent. Allez dans <LinkOut href="/dashboard/domains">Envoi → Domaines</LinkOut> et verifiez que votre domaine a une coche verte.
                </p>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
