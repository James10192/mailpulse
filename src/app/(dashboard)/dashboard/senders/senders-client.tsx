"use client";

import { useState, useActionState } from "react";
import { Plus, AtSign, Trash2, X, Info, Pencil, Star } from "lucide-react";
import { createSender, updateSender, deleteSender, setDefaultSender } from "./actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { HelpModal, HelpButton, StepList, LinkOut } from "@/components/dashboard/help-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
              Expediteurs
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Gerez les adresses email utilisees pour envoyer vos campagnes
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Creer un expediteur
          </button>
        </div>

        <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-300/80">
              Pour envoyer des campagnes, configurez au moins un expediteur. Cliquez sur &laquo; Comment configurer ? &raquo; pour en savoir plus.
            </p>
          </div>
          <HelpButton onClick={() => setHelpOpen(true)} />
        </div>

        <SenderHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

        {senders.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                    Nom
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                    Statut
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Repondre a
                  </th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {senders.map((sender) => (
                  <tr
                    key={sender.id}
                    onClick={() => setEditSender(sender)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <AtSign className="h-4 w-4 text-zinc-400" />
                        {sender.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-500">
                      {sender.email}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {sender.isDefault ? (
                        <Badge variant="success" className="gap-1">
                          <Star className="h-3 w-3" />
                          Par defaut
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
                          Definir
                        </Button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-500 hidden sm:table-cell">
                      {sender.replyTo || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditSender(sender); }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(sender.id); }}
                          disabled={deleting === sender.id}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
            <AtSign className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Aucun expediteur configure. Creez votre premier expediteur pour envoyer des campagnes.
            </p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {createOpen && (
        <SenderModal
          title="Nouvel expediteur"
          domains={domains}
          action={createAction}
          state={createState}
          isPending={isCreating}
          onClose={() => setCreateOpen(false)}
          submitLabel="Creer"
          pendingLabel="Creation..."
        />
      )}

      {/* Edit modal */}
      {editSender && (
        <SenderModal
          title="Modifier l'expediteur"
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
        title="Supprimer cet expediteur ?"
        message="Cette action est irreversible."
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={action} className="space-y-4">
          {sender && <input type="hidden" name="id" value={sender.id} />}
          {/* Hidden composed email for the server action */}
          <input type="hidden" name="email" value={composedEmail} />

          <div>
            <label htmlFor="sender-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Nom *
            </label>
            <input
              id="sender-name"
              name="name"
              type="text"
              required
              defaultValue={sender?.name ?? ""}
              placeholder="Mon Entreprise"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Adresse email *
            </label>
            <div className="flex items-center gap-0">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._+-]/g, ""))}
                required
                placeholder="contact"
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
              <span className="px-2 py-2 bg-zinc-100 dark:bg-zinc-800 border-y border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500">
                @
              </span>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 cursor-pointer"
              >
                {domains.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            {composedEmail && (
              <p className="text-xs text-zinc-500 mt-1 font-mono">{composedEmail}</p>
            )}
          </div>

          <div>
            <label htmlFor="sender-reply" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email de reponse (optionnel)
            </label>
            <input
              id="sender-reply"
              name="replyTo"
              type="email"
              defaultValue={sender?.replyTo ?? ""}
              placeholder="reponse@exemple.com"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !username}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? pendingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Sender Help Modal ─── */

function SenderHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <HelpModal
      open={open}
      onClose={onClose}
      title="Configurer un expediteur"
      subtitle="Guide complet pas-a-pas"
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
