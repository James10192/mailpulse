"use client";

import { Maximize, Power, PowerOff, Redo2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  PAUSED: "En pause",
  ARCHIVED: "Archivé",
};

interface WorkflowHeaderActions {
  undo: () => void;
  redo: () => void;
  fitView: () => void;
  toggleStatus: () => void;
}

/** Title, status, graph size and the undo / redo / fit / activation controls of the workflow editor. */
export function WorkflowHeader({
  name,
  status,
  saving,
  counts,
  actions,
}: {
  name: string;
  status: string;
  saving: boolean;
  counts: { nodes: number; edges: number };
  actions: WorkflowHeaderActions;
}) {
  const isActive = status === "ACTIVE";

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {name}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant={isActive ? "success" : "secondary"}
            className="text-[10px]"
          >
            {STATUS_LABELS[status] ?? status}
          </Badge>
          <span className="text-[10px] text-zinc-600 font-mono">
            {counts.nodes} nœud{counts.nodes !== 1 ? "s" : ""} · {counts.edges}{" "}
            connexion{counts.edges !== 1 ? "s" : ""}
          </span>
          {saving && (
            <span className="text-[10px] text-zinc-500 font-mono">
              Sauvegarde...
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={actions.undo}
          title="Annuler (Ctrl+Z)"
          aria-label="Annuler (Ctrl+Z)"
          className="text-zinc-500"
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={actions.redo}
          title="Rétablir (Ctrl+Shift+Z)"
          aria-label="Rétablir (Ctrl+Shift+Z)"
          className="text-zinc-500"
        >
          <Redo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={actions.fitView}
          title="Ajuster la vue"
          aria-label="Ajuster la vue"
          className="text-zinc-500"
        >
          <Maximize />
        </Button>
        {isActive ? (
          <Button variant="outline-destructive" onClick={actions.toggleStatus}>
            <PowerOff />
            Désactiver
          </Button>
        ) : (
          <Button onClick={actions.toggleStatus}>
            <Power />
            Activer le workflow
          </Button>
        )}
      </div>
    </div>
  );
}
