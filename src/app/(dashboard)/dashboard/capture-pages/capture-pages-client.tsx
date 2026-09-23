"use client";

import { useState, useActionState } from "react";
import { Plus, Globe, Trash2, ExternalLink, Eye, EyeOff, Info } from "lucide-react";
import Link from "next/link";
import { createCapturePage, deleteCapturePage, toggleCapturePagePublished } from "./actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
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
import type { ActionState } from "@/types/action-state";

interface CapturePageData {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  createdAt: string;
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

        <Alert role="note" className="flex items-start gap-3 rounded-xl p-4">
          <Info className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <AlertDescription className="text-zinc-600 dark:text-zinc-400">
            Créez des formulaires d&apos;inscription publics pour collecter des abonnés. Partagez le lien de votre page ou intégrez-la sur votre site web.
          </AlertDescription>
        </Alert>

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
                    {page.published ? (
                      <Badge variant="success">Publiée</Badge>
                    ) : (
                      <Badge variant="secondary">Brouillon</Badge>
                    )}
                  </div>
                  <div className="text-xs font-mono text-zinc-500 break-all">/capture/{page.slug}</div>
                  <div className="text-xs text-zinc-500">
                    Créée le {new Date(page.createdAt).toLocaleDateString("fr-FR")}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {page.published && (
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-500/10 [&_svg]:size-3.5"
                      >
                        <a
                          href={`/capture/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Voir la page"
                          aria-label="Voir la page"
                        >
                          <ExternalLink />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(page.id, page.published)}
                      disabled={toggling === page.id}
                      className="h-8 w-8 text-zinc-400 [&_svg]:size-3.5"
                      title={page.published ? "Dépublier" : "Publier"}
                      aria-label={page.published ? "Dépublier" : "Publier"}
                    >
                      {page.published ? <EyeOff /> : <Eye />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDeleteId(page.id)}
                      disabled={deleting === page.id}
                      className="h-8 w-8 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 [&_svg]:size-3.5"
                      title="Supprimer"
                      aria-label="Supprimer"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                    Nom
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    URL
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                    Statut
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Date
                  </th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {pages.map((page) => (
                  <tr
                    key={page.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/capture-pages/${page.id}`}
                        className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors"
                      >
                        <Globe className="h-4 w-4 text-zinc-400" />
                        {page.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-500 hidden md:table-cell">
                      <span className="truncate max-w-xs block">
                        /capture/{page.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {page.published ? (
                      <Badge variant="success">Publiée</Badge>
                    ) : (
                      <Badge variant="secondary">Brouillon</Badge>
                    )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 font-mono hidden md:table-cell">
                      {new Date(page.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {page.published && (
                          <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:bg-orange-50 hover:text-orange-500 dark:hover:bg-orange-500/10 [&_svg]:size-3.5"
                      >
                        <a
                          href={`/capture/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Voir la page"
                          aria-label="Voir la page"
                        >
                          <ExternalLink />
                        </a>
                      </Button>
                        )}
                        <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(page.id, page.published)}
                      disabled={toggling === page.id}
                      className="h-8 w-8 text-zinc-400 [&_svg]:size-3.5"
                      title={page.published ? "Dépublier" : "Publier"}
                      aria-label={page.published ? "Dépublier" : "Publier"}
                    >
                          {page.published ? <EyeOff /> : <Eye />}
                        </Button>
                        <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDeleteId(page.id)}
                      disabled={deleting === page.id}
                      className="h-8 w-8 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 [&_svg]:size-3.5"
                      title="Supprimer"
                      aria-label="Supprimer"
                    >
                      <Trash2 />
                    </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Create modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle page de capture</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
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

            {state?.error && (
              <p className="text-sm text-red-500">{state.error}</p>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
