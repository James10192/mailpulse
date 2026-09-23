"use client";

import type { Editor } from "@tiptap/react";
import { ChevronDown, Heading1, Heading2, Heading3, Type } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FONT_SIZES } from "./editor-config";
import { keepEditorFocus, ToolbarButton } from "./toolbar-primitives";

const HEADINGS = [
  { label: "Paragraphe", icon: Type, run: (e: Editor) => e.chain().focus().setParagraph().run() },
  { label: "Titre 1", icon: Heading1, run: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "Titre 2", icon: Heading2, run: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Titre 3", icon: Heading3, run: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run() },
];

const DEFAULT_FONT_SIZE = "default";

export function HeadingMenu({ editor }: { editor: Editor }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton label="Titre" active={editor.isActive("heading")}>
          <Type />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40" onCloseAutoFocus={keepEditorFocus(editor)}>
        {HEADINGS.map(({ label, icon: Icon, run }) => (
          <DropdownMenuItem key={label} onSelect={() => run(editor)}>
            <Icon className="size-4" /> {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FontSizeMenu({ editor }: { editor: Editor }) {
  const current = (editor.getAttributes("textStyle")?.fontSize as string | undefined) ?? DEFAULT_FONT_SIZE;

  function select(value: string) {
    const chain = editor.chain().focus();
    (value === DEFAULT_FONT_SIZE ? chain.unsetFontSize() : chain.setFontSize(value)).run();
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton label="Taille de police" size="toolbar" className="min-w-11 sm:min-w-10">
          <span>{current === DEFAULT_FONT_SIZE ? "16" : current.replace("px", "")}</span>
          <ChevronDown />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-32 min-w-32 overflow-y-auto" onCloseAutoFocus={keepEditorFocus(editor)}>
        <DropdownMenuRadioGroup value={current} onValueChange={select}>
          <DropdownMenuRadioItem value={DEFAULT_FONT_SIZE} className="text-zinc-500">
            Par défaut
          </DropdownMenuRadioItem>
          {FONT_SIZES.map((fs) => (
            <DropdownMenuRadioItem key={fs.value} value={fs.value}>
              {fs.label}px
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
