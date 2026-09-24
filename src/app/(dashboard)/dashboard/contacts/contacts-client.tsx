"use client";

import { useState, useMemo } from "react";
import { Plus, Upload, Users, Sparkles } from "lucide-react";
import Link from "next/link";
import { AddContactPanel } from "@/components/dashboard/add-contact-panel";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { deleteContact } from "./actions";
import { LimitWarningBanner } from "@/components/dashboard/feature-gate";
import { PageHint } from "@/components/dashboard/page-hint";
import { Button } from "@/components/ui/button";
import {
  collectTags,
  filterAndSortContacts,
  INITIAL_FILTERS,
  type ContactData,
  type ContactFilters,
} from "./contacts-filtering";
import { ContactsList } from "./contacts-list";
import { ContactsToolbar } from "./contacts-toolbar";

function StatCards({ stats }: { stats: { total: number; subscribed: number; unsubscribed: number } }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { label: "Total contacts", value: stats.total },
        { label: "Abonnés", value: stats.subscribed },
        { label: "Désabonnés", value: stats.unsubscribed },
      ].map((stat) => (
        <div
          key={stat.label}
          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
        >
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{stat.label}</div>
          <div className="text-xl font-semibold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
            {stat.value.toLocaleString("fr-FR")}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContactsClient({
  stats,
  contacts,
  canCreate,
  limit,
  currentCount,
  planLabel,
  overLimit,
}: {
  stats: { total: number; subscribed: number; unsubscribed: number };
  contacts: ContactData[];
  canCreate: boolean;
  limit: number;
  currentCount: number;
  planLabel: string;
  overLimit: boolean;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [filters, setFilters] = useState<ContactFilters>(INITIAL_FILTERS);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const allTags = useMemo(() => collectTags(contacts), [contacts]);
  const filtered = useMemo(() => filterAndSortContacts(contacts, filters), [contacts, filters]);

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeleting(id);
    const result = await deleteContact(id);
    setDeleting(null);
    if (result?.error) {
      setDeleteError(result.error);
    }
  }

  return (
    <>
      <div className="page-stack app-shell-safe">
        {overLimit && limit !== -1 && (
          <LimitWarningBanner
            resourceLabel="contacts"
            current={currentCount}
            limit={limit}
            planLabel={planLabel}
            actionLabel="Vous ne pouvez plus en ajouter. Passez au Pro pour des contacts illimités."
          />
        )}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Contacts
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Gérez vos listes de contacts et segments
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {canCreate ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/dashboard/contacts/import">
                    <Upload className="h-4 w-4" />
                    Importer CSV
                  </Link>
                </Button>
                <Button onClick={() => setPanelOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">
                  {currentCount}/{limit === -1 ? "∞" : limit} contacts
                </span>
                <Button asChild variant="outline-accent">
                  <Link href="/dashboard/settings/billing">
                    <Sparkles className="h-3.5 w-3.5" />
                    Passer au Pro
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <PageHint>
          Gérez votre base de contacts. Ajoutez des contacts manuellement, via les pages de capture, ou par import CSV. Les tags permettent de segmenter votre audience.
        </PageHint>

        <StatCards stats={stats} />

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
          <ContactsToolbar
            filters={filters}
            tags={allTags}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          />

          {filtered.length > 0 ? (
            <ContactsList contacts={filtered} actions={{ deletingId: deleting, onDelete: setConfirmDeleteId }} />
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-4">
                Aucun contact pour le moment.
              </p>
              <Button variant="link" onClick={() => setPanelOpen(true)}>
                Ajouter votre premier contact
              </Button>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-zinc-500">
              Aucun résultat pour &quot;{filters.search}&quot;
            </div>
          )}
        </div>
      </div>

      <AddContactPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        availableTags={allTags.map((t) => t.name)}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Supprimer ce contact"
        message="Cette action est irréversible. Le contact sera définitivement supprimé."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        open={deleteError !== null}
        title="Erreur"
        message={deleteError ?? ""}
        confirmLabel="OK"
        onConfirm={() => setDeleteError(null)}
        onCancel={() => setDeleteError(null)}
      />
    </>
  );
}
