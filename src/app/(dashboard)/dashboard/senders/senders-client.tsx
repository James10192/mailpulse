"use client";

import { useState, useActionState } from "react";
import { Plus, AtSign, Trash2, Pencil, Star } from "lucide-react";
import { createSender, updateSender, deleteSender, setDefaultSender } from "./actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { FormDialog } from "@/components/dashboard/form-dialog";
import { SenderHelpModal } from "./sender-help-modal";
import { PageHint } from "@/components/dashboard/page-hint";
import { Badge } from "@/components/ui/badge";
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

        <PageHint onHelp={() => setHelpOpen(true)}>
          Pour envoyer des campagnes, configurez au moins un expéditeur. Cliquez sur &laquo; Comment configurer ? &raquo; pour en savoir plus.
        </PageHint>

        <SenderHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

        {senders.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
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
                          size="icon-sm"
                          onClick={(e) => { e.stopPropagation(); setEditSender(sender); }}
                          className="text-zinc-500 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
                          title="Modifier"
                          aria-label={`Modifier l'expéditeur ${sender.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost-destructive"
                          size="icon-sm"
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(sender.id); }}
                          disabled={deleting === sender.id}
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
          form={{ action: createAction, state: createState, pending: isCreating }}
          onClose={() => setCreateOpen(false)}
          submit={{ label: "Créer", pendingLabel: "Création..." }}
        />
      )}

      {/* Edit modal */}
      {editSender && (
        <SenderModal
          title="Modifier l'expéditeur"
          domains={domains}
          form={{ action: editAction, state: editState, pending: isEditing }}
          onClose={() => setEditSender(null)}
          submit={{ label: "Enregistrer", pendingLabel: "Enregistrement..." }}
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
  form,
  onClose,
  submit,
  sender,
}: {
  title: string;
  domains: string[];
  form: { action: (formData: FormData) => void; state: ActionState; pending: boolean };
  onClose: () => void;
  submit: { label: string; pendingLabel: string };
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
    <FormDialog
      open
      onOpenChange={(next) => { if (!next) onClose(); }}
      title={title}
      action={form.action}
      error={form.state?.error}
      pending={form.pending}
      submit={{ ...submit, disabled: !username }}
    >
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
            className="flex-1 rounded-r-none"
          />
          <span className="flex h-11 items-center border-y border-zinc-200 bg-zinc-100 px-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800">
            @
          </span>
          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
            <SelectTrigger className="h-11 flex-1 rounded-l-none" aria-label="Domaine d'envoi">
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
        />
      </div>
    </FormDialog>
  );
}
