"use client";

import type { Editor } from "@tiptap/react";
import { ChevronDown, FileCode, Variable } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VARIABLES, type SnippetOption } from "./editor-config";
import { keepEditorFocus, ToolbarButton } from "./toolbar-primitives";

/** Inserts a merge variable as a mention chip. The menu closes itself on select. */
export function VariablesMenu({ editor }: { editor: Editor }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton label="Insérer une variable" size="toolbar">
          <Variable /><span className="hidden sm:inline">Variables</span><ChevronDown />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-60 overflow-y-auto" onCloseAutoFocus={keepEditorFocus(editor)}>
        {VARIABLES.map((v) => (
          <DropdownMenuItem
            key={v.name}
            onSelect={() => editor.chain().focus().insertContent({ type: "mention", attrs: { id: v.name, label: v.label } }).run()}
            className="justify-between"
          >
            <span className="text-zinc-700 dark:text-zinc-300">{v.label}</span>
            <code className="rounded bg-orange-500/10 px-1 py-0.5 font-mono text-[10px] text-orange-600">{`{{ ${v.name} }}`}</code>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Inserts a saved snippet's HTML at the cursor. */
export function SnippetsMenu({ editor, snippets }: { editor: Editor; snippets: SnippetOption[] }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton label="Insérer un snippet" size="toolbar">
          <FileCode /><span className="hidden sm:inline">Snippets</span><ChevronDown />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto" onCloseAutoFocus={keepEditorFocus(editor)}>
        {snippets.length === 0 ? (
          <div className="px-3 py-2 text-xs text-zinc-500">Aucun snippet</div>
        ) : snippets.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => editor.chain().focus().insertContent(s.htmlContent).run()}>
            <FileCode className="size-3.5 shrink-0 text-orange-500" />
            <span className="truncate text-zinc-700 dark:text-zinc-300">{s.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
