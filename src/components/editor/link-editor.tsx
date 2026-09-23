"use client";

import { useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { ExternalLink, Link as LinkIcon, Pencil, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { readString } from "./editor-attributes";
import { ToolbarButton, useEditorFocusReturn } from "./toolbar-primitives";

/**
 * The link editor is the one controlled popover of the toolbar: both the toolbar
 * button and the link bubble menu open it, so its state lives above both.
 */
export function useLinkEditor(editor: Editor | null) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  function start() {
    if (!editor) return;
    setUrl(editor.getAttributes("link").href || "");
    setOpen(true);
  }

  function apply() {
    if (!editor) return;
    const href = url.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    (href ? chain.setLink({ href }) : chain.unsetLink()).run();
    setOpen(false);
  }

  function clear() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setUrl("");
    setOpen(false);
  }

  return { open, setOpen, url, setUrl, start, apply, clear };
}

export type LinkEditorState = ReturnType<typeof useLinkEditor>;

/** Toolbar button + URL popover. Anchored rather than triggered, because the bubble menu opens it too. */
export function LinkPopover({ editor, link, active }: { editor: Editor; link: LinkEditorState; active: boolean }) {
  const focus = useEditorFocusReturn(editor);
  return (
    <Popover open={link.open} onOpenChange={link.setOpen}>
      <PopoverAnchor asChild>
        <ToolbarButton label="Lien" active={active || link.open} aria-expanded={link.open} onClick={link.start}>
          <LinkIcon />
        </ToolbarButton>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-72 p-2"
        onEscapeKeyDown={focus.returnOnClose}
        onCloseAutoFocus={focus.onCloseAutoFocus}
      >
        <Label className="block text-[10px] font-normal uppercase tracking-wider text-zinc-500 dark:text-zinc-500" htmlFor="rich-editor-link-url">
          URL du lien
        </Label>
        <Input
          id="rich-editor-link-url"
          value={link.url}
          onChange={(event) => link.setUrl(event.target.value)}
          placeholder="https://..."
          className="mt-1 h-11 rounded-md px-2 sm:h-10"
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => focus.run(link.clear)} className="text-zinc-500">
            Retirer
          </Button>
          <Button type="button" size="sm" onClick={() => focus.run(link.apply)}>
            Appliquer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Floating actions shown when the cursor sits in a link. */
export function LinkBubbleMenu({ editor, onEdit }: { editor: Editor; onEdit: () => void }) {
  const href = useEditorState({
    editor,
    selector: ({ editor: e }) => readString(e.getAttributes("link").href) ?? "",
  });
  return (
    <BubbleMenu editor={editor} shouldShow={({ editor: ed }) => ed.isActive("link") && !ed.isActive("image")}>
      <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[200px] truncate text-xs text-orange-600 underline hover:text-orange-500"
        >
          {href}
        </a>
        <ToolbarButton label="Ouvrir le lien" size="icon-xs" onClick={() => window.open(href, "_blank", "noopener,noreferrer")}>
          <ExternalLink />
        </ToolbarButton>
        <ToolbarButton label="Modifier le lien" size="icon-xs" onClick={onEdit}>
          <Pencil />
        </ToolbarButton>
        <ToolbarButton
          label="Supprimer le lien"
          size="icon-xs"
          variant="ghost-destructive"
          onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
        >
          <Unlink />
        </ToolbarButton>
      </div>
    </BubbleMenu>
  );
}
