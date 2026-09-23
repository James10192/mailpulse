"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SnippetOption } from "./editor-config";
import { createEditorExtensions } from "./editor-extensions";
import { EditorToolbar } from "./editor-toolbar";
import { ImageBubbleMenu } from "./image-bubble-toolbar";
import { LinkBubbleMenu, useLinkEditor } from "./link-editor";
import { TOOLTIP_DELAY_MS } from "./toolbar-primitives";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  snippets?: SnippetOption[];
}

const UPLOAD_ERROR = "Erreur lors de l'envoi de l'image";

/** Uploads the image, then inserts it as a new block after the selection (never replaces it). */
function useImageUpload(editor: Editor | null) {
  const [error, setError] = useState("");

  async function upload(file: File) {
    if (!editor) return;
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) { setError(UPLOAD_ERROR); return; }
      const data = await res.json();
      if (!data.url) { setError(data.error || UPLOAD_ERROR); return; }
      const endPos = editor.state.selection.$to.pos;
      editor.chain().focus()
        .insertContentAt(endPos, [
          { type: "image", attrs: { src: data.url, alt: file.name } },
          { type: "paragraph" },
        ])
        .run();
    } catch {
      setError(UPLOAD_ERROR);
    }
  }

  return { error, upload };
}

/** Live character and word counts, re-rendered on each document change. */
function CharacterCounter({ editor }: { editor: Editor }) {
  const { characters, words } = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      characters: e.storage.characterCount?.characters() ?? 0,
      words: e.storage.characterCount?.words() ?? 0,
    }),
  });
  return (
    <>
      <span>{characters} caractère{characters !== 1 ? "s" : ""}</span>
      <span>{words} mot{words !== 1 ? "s" : ""}</span>
    </>
  );
}

export function RichEditor({ content, onChange, placeholder, snippets }: RichEditorProps) {
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const editor = useEditor({
    extensions: createEditorExtensions(placeholder),
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "p-4 min-h-[200px] prose prose-sm dark:prose-invert max-w-none focus:outline-none" },
    },
    onUpdate: ({ editor: e }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChangeRef.current(e.getHTML()), 300);
    },
  });

  const link = useLinkEditor(editor);
  const image = useImageUpload(editor);

  if (!editor) {
    return <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"><div className="min-h-[200px] p-4" /></div>;
  }


  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <EditorToolbar editor={editor} link={link} snippets={snippets} onImageFile={image.upload} />
        <LinkBubbleMenu editor={editor} onEdit={link.start} />
        <ImageBubbleMenu editor={editor} />

        {image.error ? (
          <div role="alert" className="mx-3 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
            {image.error}
          </div>
        ) : null}
        <EditorContent editor={editor} />

        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-3 py-1.5 font-mono text-[11px] text-zinc-400 dark:border-zinc-800">
          <CharacterCounter editor={editor} />
        </div>
      </div>
    </TooltipProvider>
  );
}
