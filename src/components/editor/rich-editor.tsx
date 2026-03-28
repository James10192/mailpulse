"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link as LinkIcon,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  ChevronDown,
  Variable,
} from "lucide-react";

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const VARIABLES = [
  { name: "email", label: "Email du contact" },
  { name: "name", label: "Nom du contact" },
  { name: "firstName", label: "Prenom" },
  { name: "lastName", label: "Nom de famille" },
  { name: "tags", label: "Tags du contact" },
  { name: "currentTime", label: "Date actuelle" },
  { name: "unsubscribeUrl", label: "Lien de desinscription" },
  { name: "viewOnlineUrl", label: "Voir en ligne" },
];

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-orange-500/10 text-orange-600"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />;
}

export function RichEditor({ content, onChange, placeholder }: RichEditorProps) {
  const [variablesOpen, setVariablesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-orange-600 underline cursor-pointer",
        },
      }),
      TextAlign.configure({
        types: ["paragraph"],
      }),
      Underline,
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "p-4 min-h-[200px] prose prose-sm dark:prose-invert max-w-none focus:outline-none",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChangeRef.current(editor.getHTML());
      }, 300);
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setVariablesOpen(false);
      }
    }
    if (variablesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [variablesOpen]);

  const insertVariable = useCallback(
    (varName: string) => {
      editor?.chain().focus().insertContent(`{{ ${varName} }}`).run();
      setVariablesOpen(false);
    },
    [editor]
  );

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL du lien", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="p-4 min-h-[200px]" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-t-xl flex-wrap">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Gras"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italique"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Souligne"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Barre"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={setLink}
          active={editor.isActive("link")}
          title="Lien"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="Effacer le formatage"
        >
          <RemoveFormatting className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Aligner a gauche"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Centrer"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Aligner a droite"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Annuler"
        >
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Refaire"
        >
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Variables dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setVariablesOpen((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              variablesOpen
                ? "bg-orange-500/10 text-orange-600"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            }`}
            title="Inserer une variable"
          >
            <Variable className="w-4 h-4" />
            <span className="hidden sm:inline">Variables</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {variablesOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg py-1 overflow-hidden">
              {VARIABLES.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => insertVariable(v.name)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer flex items-center justify-between gap-2"
                >
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {v.label}
                  </span>
                  <code className="text-xs text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded font-mono">
                    {`{{ ${v.name} }}`}
                  </code>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}
