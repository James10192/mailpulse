"use client";

import { ExternalLink, Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** View / publish toggle / delete actions, shared by the mobile card and the desktop table row. */
export function CapturePageRowActions({
  page,
  toggling,
  deleting,
  onToggle,
  onDelete,
}: {
  page: { slug: string; published: boolean };
  toggling: boolean;
  deleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const toggleLabel = page.published ? "Dépublier" : "Publier";
  return (
    <div className="flex items-center justify-end gap-1">
      {page.published && (
        <Button asChild variant="ghost" size="icon-sm" className="text-zinc-500 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400">
          <a href={`/capture/${page.slug}`} target="_blank" rel="noopener noreferrer" title="Voir la page" aria-label="Voir la page">
            <ExternalLink />
          </a>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        disabled={toggling}
        className="text-zinc-500 dark:text-zinc-400"
        title={toggleLabel}
        aria-label={toggleLabel}
      >
        {page.published ? <EyeOff /> : <Eye />}
      </Button>
      <Button variant="ghost-destructive" size="icon-sm" onClick={onDelete} disabled={deleting} title="Supprimer" aria-label="Supprimer">
        <Trash2 />
      </Button>
    </div>
  );
}
