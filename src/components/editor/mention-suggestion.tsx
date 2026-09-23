"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { ReactRenderer, type Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { VARIABLES, type EditorVariable } from "./editor-config";

interface MentionListRef {
  onKeyDown: (p: { event: KeyboardEvent }) => boolean;
}

type MentionCommand = (item: { id: string; label: string }) => void;

const MentionList = forwardRef<MentionListRef, { items: EditorVariable[]; command: MentionCommand }>(
  ({ items, command }, ref) => {
    const [sel, setSel] = useState(0);
    useEffect(() => {
      const timer = window.setTimeout(() => setSel(0), 0);
      return () => window.clearTimeout(timer);
    }, [items]);
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") { setSel((i) => (i + items.length - 1) % items.length); return true; }
        if (event.key === "ArrowDown") { setSel((i) => (i + 1) % items.length); return true; }
        if (event.key === "Enter") { const it = items[sel]; if (it) command({ id: it.name, label: it.label }); return true; }
        return false;
      },
    }), [items, sel, command]);
    return (
      <div className="z-50 max-h-48 w-56 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        {items.length === 0 ? <div className="px-3 py-2 text-xs text-zinc-500">Aucune variable</div> : items.map((it, i) => (
          <button key={it.name} type="button" onClick={() => command({ id: it.name, label: it.label })}
            className={cn("flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm",
              i === sel ? "bg-orange-500/10 text-orange-600" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
            )}>
            <span>{it.label}</span>
            <code className="font-mono text-[10px] text-orange-500">{`{{ ${it.name} }}`}</code>
          </button>
        ))}
      </div>
    );
  }
);
MentionList.displayName = "MentionList";

type MentionSuggestionProps = {
  items: EditorVariable[];
  command: MentionCommand;
  editor: Editor;
  clientRect?: (() => DOMRect | null) | null;
};

/** `@` autocomplete for merge variables, rendered in a floating container. */
export const mentionSuggestion = {
  char: "@",
  items: ({ query }: { query: string }) => VARIABLES.filter((v) => v.label.toLowerCase().includes(query.toLowerCase()) || v.name.toLowerCase().includes(query.toLowerCase())),
  render: () => {
    let component: ReactRenderer<MentionListRef>;
    let container: HTMLDivElement;
    const place = (props: MentionSuggestionProps) => {
      const r = props.clientRect?.();
      if (r && container) { container.style.left = `${r.left}px`; container.style.top = `${r.bottom + 4}px`; }
    };
    return {
      onStart: (props: MentionSuggestionProps) => {
        container = document.createElement("div"); container.style.position = "absolute"; container.style.zIndex = "9999";
        document.body.appendChild(container);
        component = new ReactRenderer(MentionList, { props: { items: props.items, command: props.command }, editor: props.editor });
        container.appendChild(component.element);
        place(props);
      },
      onUpdate: (props: MentionSuggestionProps) => {
        component?.updateProps({ items: props.items, command: props.command });
        place(props);
      },
      onKeyDown: (props: { event: KeyboardEvent }) => { if (props.event.key === "Escape") return true; return component?.ref?.onKeyDown(props) ?? false; },
      onExit: () => { component?.destroy(); container?.remove(); },
    };
  },
};
