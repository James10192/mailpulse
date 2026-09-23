"use client";

import { useState, useActionState } from "react";
import { Plus, Globe } from "lucide-react";
import Link from "next/link";
import { createCapturePage, deleteCapturePage, toggleCapturePagePublished } from "./actions";
import { CapturePageRowActions } from "./capture-page-row-actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { FormDialog } from "@/components/dashboard/form-dialog";
import { PageHint } from "@/components/dashboard/page-hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/types/action-state";

interface CapturePageData {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  createdAt: string;
}

function PublishedBadge({ published }: { published: boolean }) {
  return published ? <Badge variant="success">Publiée</Badge> : <Badge variant="secondary">Brouillon</Badge>;
}

export function CapturePagesClient({ pages }: { pages: CapturePageData[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createCapturePage(prev, formData);
      if (result?.success) setModalOpen(false);
      return result;
    },
    null
  );

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeleting(id);
    await deleteCapturePage(id);
    setDeleting(null);
  }

  async function handleToggle(id: string, published: boolean) {
    setToggling(id);
    await toggleCapturePagePublished(id, !published);
    setToggling(null);
  }

  function rowActions(page: CapturePageData) {
    return (
      <CapturePageRowActions
        page={page}
        toggling={toggling === page.id}
        deleting={deleting === page.id}
        onToggle={() => handleToggle(page.id, page.published)}
        onDelete={() => setConfirmDeleteId(page.id)}
      />
    );
  }

  return (
    <>
      <div className="page-stack app-shell-safe">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Pages de capture
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Créez des formulaires pour collecter des abonnés
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus />
            Créer une page
          </Button>
        </div>

        <PageHint>
          Créez des formulaires d&apos;inscription publics pour collecter des abonnés. Partagez le lien de votre page ou intégrez-la sur votre site web.
        </PageHint>

        {pages.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/30 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/dashboard/capture-pages/${page.id}`}
                      className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors min-w-0"
                    >
                      <Globe className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span className="truncate">{page.name}</span>
                    </Link>
                    <PublishedBadge published={page.published} />
                  </div>
                  <div className="text-xs font-mono text-zinc-500 break-all">/capture/{page.slug}</div>
                  <div className="text-xs text-zinc-500">
                    Créée le {new Date(page.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                  {rowActions(page)}
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4">
                      Nom
                    </TableHead>
                    <TableHead className="px-4">
                      URL
                    </TableHead>
                    <TableHead className="px-4">
                      Statut
                    </TableHead>
                    <TableHead className="px-4">
                      Date
                    </TableHead>
                    <TableHead className="text-right px-4 w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="px-4 py-3">
                        <Link
                          href={`/dashboard/capture-pages/${page.id}`}
                          className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors"
                        >
                          <Globe className="h-4 w-4 text-zinc-400" />
                          {page.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs font-mono text-zinc-500">
                        <span className="truncate max-w-xs block">
                          /capture/{page.slug}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <PublishedBadge published={page.published} />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-zinc-500 font-mono">
                        {new Date(page.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">{rowActions(page)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
            <Globe className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Aucune page de capture. Créez un formulaire pour collecter des abonnés.
            </p>
          </div>
        )}
      </div>

      <FormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Nouvelle page de capture"
        action={formAction}
        error={state?.error}
        pending={isPending}
        submit={{ label: "Créer", pendingLabel: "Création..." }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="page-name">Nom de la page *</Label>
          <Input
            id="page-name"
            name="name"
            type="text"
            required
            placeholder="Newsletter inscription"
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer cette page ?"
        message="Cette action est irréversible. La page et son formulaire seront supprimés."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}
