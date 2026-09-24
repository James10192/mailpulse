"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { readString } from "@/lib/guards";

/**
 * Everything the toolbar displays about the current selection. Tiptap v3's
 * `useEditor` no longer re-renders on each transaction, so the toolbar subscribes
 * through `useEditorState`: it re-renders only when one of these values changes.
 */
export function useToolbarState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: e.isActive("link"),
      heading: e.isActive("heading"),
      alignLeft: e.isActive({ textAlign: "left" }),
      alignCenter: e.isActive({ textAlign: "center" }),
      alignRight: e.isActive({ textAlign: "right" }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      fontSize: readString(e.getAttributes("textStyle").fontSize),
      textColor: readString(e.getAttributes("textStyle").color),
    }),
  });
}

export type ToolbarState = ReturnType<typeof useToolbarState>;
