"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { ColumnsIcon, Plus, RowsIcon, TableIcon, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PopoverCaption, ToolbarButton, useEditorFocusReturn } from "./toolbar-primitives";

const GRID_SIZE = 6;

type TableAction = { label: string; icon: React.ReactNode; run: (editor: Editor) => boolean };

const INSERT_ACTIONS: TableAction[] = [
  { label: "Ajouter une ligne en dessous", icon: <Plus />, run: (e) => e.chain().focus().addRowAfter().run() },
  { label: "Ajouter une ligne au-dessus", icon: <RowsIcon />, run: (e) => e.chain().focus().addRowBefore().run() },
  { label: "Ajouter une colonne à droite", icon: <Plus />, run: (e) => e.chain().focus().addColumnAfter().run() },
  { label: "Ajouter une colonne à gauche", icon: <ColumnsIcon />, run: (e) => e.chain().focus().addColumnBefore().run() },
];

const DELETE_ACTIONS: TableAction[] = [
  { label: "Supprimer la ligne", icon: <X />, run: (e) => e.chain().focus().deleteRow().run() },
  { label: "Supprimer la colonne", icon: <X />, run: (e) => e.chain().focus().deleteColumn().run() },
  { label: "Supprimer le tableau", icon: <Trash2 />, run: (e) => e.chain().focus().deleteTable().run() },
];

/** Grid picker shown outside a table: hovering previews the size, clicking inserts it. */
function TableGridSelector({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });

  return (
    <div className="w-auto p-2 sm:w-48">
      <PopoverCaption>Insérer un tableau</PopoverCaption>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
          const r = Math.floor(i / GRID_SIZE) + 1;
          const c = (i % GRID_SIZE) + 1;
          const active = r <= hover.r && c <= hover.c;
          return (
            <PopoverClose key={i} asChild>
              <button
                type="button"
                aria-label={`Tableau ${r} x ${c}`}
                className={cn(
                  "size-11 rounded-sm border sm:size-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35",
                  active ? "border-orange-500 bg-orange-500/30" : "border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800",
                )}
                onMouseEnter={() => setHover({ r, c })}
                onFocus={() => setHover({ r, c })}
                onClick={() => onSelect(r, c)}
              />
            </PopoverClose>
          );
        })}
      </div>
      {hover.r > 0 && <p className="mt-1.5 text-center text-xs text-zinc-500">{hover.r} x {hover.c}</p>}
    </div>
  );
}

function TableActionList({ editor, actions, destructive, run }: { editor: Editor; actions: TableAction[]; destructive?: boolean; run: (action: () => void) => void }) {
  return actions.map((action) => (
    <PopoverClose key={action.label} asChild>
      <Button
        type="button"
        variant={destructive ? "ghost-destructive" : "ghost"}
        size="sm"
        onClick={() => run(() => action.run(editor))}
        className="w-full justify-start font-normal"
      >
        {action.icon} {action.label}
      </Button>
    </PopoverClose>
  ));
}

/** Table button: a size picker outside a table, row/column actions inside one. */
export function TableMenu({ editor, inTable }: { editor: Editor; inTable: boolean }) {
  const focus = useEditorFocusReturn(editor);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton label="Tableau" active={inTable}>
          <TableIcon />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-1" onCloseAutoFocus={focus.onCloseAutoFocus}>
        {inTable ? (
          <div className="w-56">
            <TableActionList editor={editor} actions={INSERT_ACTIONS} run={focus.run} />
            <Separator className="my-1" />
            <TableActionList editor={editor} actions={DELETE_ACTIONS} destructive run={focus.run} />
          </div>
        ) : (
          <TableGridSelector onSelect={(rows, cols) => focus.run(() => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run())} />
        )}
      </PopoverContent>
    </Popover>
  );
}
