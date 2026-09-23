"use client";

import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, ImagePlus, Italic, List, ListOrdered, Minus, Quote,
  Redo2, RemoveFormatting, Strikethrough, Underline as UnderlineIcon, Undo2,
} from "lucide-react";
import { ColorPopover } from "./color-popover";
import type { SnippetOption } from "./editor-config";
import { SnippetsMenu, VariablesMenu } from "./insert-menus";
import { LinkPopover, type LinkEditorState } from "./link-editor";
import { TableMenu } from "./table-menu";
import { FontSizeMenu, HeadingMenu } from "./text-style-menus";
import { ToolbarButton, ToolbarSeparator, ToolbarToggle } from "./toolbar-primitives";

type ToggleSpec = { label: string; icon: React.ComponentType; isActive: (e: Editor) => boolean; run: (e: Editor) => boolean };

const MARKS: ToggleSpec[] = [
  { label: "Gras", icon: Bold, isActive: (e) => e.isActive("bold"), run: (e) => e.chain().focus().toggleBold().run() },
  { label: "Italique", icon: Italic, isActive: (e) => e.isActive("italic"), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: "Souligné", icon: UnderlineIcon, isActive: (e) => e.isActive("underline"), run: (e) => e.chain().focus().toggleUnderline().run() },
  { label: "Barré", icon: Strikethrough, isActive: (e) => e.isActive("strike"), run: (e) => e.chain().focus().toggleStrike().run() },
];

const ALIGNMENTS: ToggleSpec[] = (["left", "center", "right"] as const).map((align) => ({
  label: align === "left" ? "Aligner à gauche" : align === "center" ? "Centrer" : "Aligner à droite",
  icon: align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight,
  isActive: (e) => e.isActive({ textAlign: align }),
  run: (e) => e.chain().focus().setTextAlign(align).run(),
}));

const BLOCKS: ToggleSpec[] = [
  { label: "Liste à puces", icon: List, isActive: (e) => e.isActive("bulletList"), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: "Liste numérotée", icon: ListOrdered, isActive: (e) => e.isActive("orderedList"), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: "Citation", icon: Quote, isActive: (e) => e.isActive("blockquote"), run: (e) => e.chain().focus().toggleBlockquote().run() },
];

function ToggleRow({ editor, specs }: { editor: Editor; specs: ToggleSpec[] }) {
  return specs.map(({ label, icon: Icon, isActive, run }) => (
    <ToolbarToggle key={label} label={label} pressed={isActive(editor)} onToggle={() => run(editor)}>
      <Icon />
    </ToolbarToggle>
  ));
}

/** Hidden file input driven by the image button; the upload itself belongs to the editor. */
function ImageButton({ onFile }: { onFile: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <ToolbarButton label="Insérer une image" onClick={() => fileRef.current?.click()}>
        <ImagePlus />
      </ToolbarButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </>
  );
}

export function EditorToolbar({ editor, link, snippets, onImageFile }: {
  editor: Editor;
  link: LinkEditorState;
  snippets?: SnippetOption[];
  onImageFile: (file: File) => void;
}) {
  return (
    <div role="toolbar" aria-label="Mise en forme" className="sticky top-0 z-30 flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-zinc-200 bg-zinc-50 p-1.5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <HeadingMenu editor={editor} />
      <FontSizeMenu editor={editor} />
      <ToolbarSeparator />
      <ToggleRow editor={editor} specs={MARKS} />
      <LinkPopover editor={editor} link={link} />
      <ToolbarSeparator />
      <ColorPopover editor={editor} mode="text" />
      <ColorPopover editor={editor} mode="highlight" />
      <ToolbarButton label="Effacer la mise en forme" onClick={() => editor.chain().focus().unsetAllMarks().run()}>
        <RemoveFormatting />
      </ToolbarButton>
      <ToolbarSeparator />
      <ToggleRow editor={editor} specs={ALIGNMENTS} />
      <ToolbarSeparator />
      <ToggleRow editor={editor} specs={BLOCKS} />
      <ToolbarSeparator />
      <ToolbarButton label="Ligne horizontale" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus />
      </ToolbarButton>
      <ImageButton onFile={onImageFile} />
      <TableMenu editor={editor} />
      <ToolbarSeparator />
      <ToolbarButton label="Annuler" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 />
      </ToolbarButton>
      <ToolbarButton label="Refaire" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 />
      </ToolbarButton>
      <ToolbarSeparator />
      <VariablesMenu editor={editor} />
      {snippets ? <SnippetsMenu editor={editor} snippets={snippets} /> : null}
    </div>
  );
}
