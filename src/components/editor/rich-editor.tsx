"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
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
  Minus,
  ImagePlus,
  Heading1,
  Heading2,
  Heading3,
  FileCode,
  Type,
} from "lucide-react";

interface SnippetOption {
  id: string;
  name: string;
  htmlContent: string;
}

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  snippets?: SnippetOption[];
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
      className={cn(
        "p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-orange-500/10 text-orange-600"
          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
      )}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />;
}

function Dropdown({
  open,
  onClose,
  children,
  dropdownRef,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose, dropdownRef]);

  if (!open) return null;

  return (
    <div className="absolute right-0 z-50 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl py-1 max-h-72 overflow-y-auto bottom-full mb-1 sm:bottom-auto sm:mb-0 sm:top-full sm:mt-1">
      {children}
    </div>
  );
}

// @ Mention suggestion list component
interface MentionListProps {
  items: { name: string; label: string }[];
  command: (item: { id: string; label: string }) => void;
}

interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) command({ id: item.name, label: item.label });
          return true;
        }
        return false;
      },
    }));

    return (
      <div className="z-50 w-56 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl py-1 max-h-48 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-3 py-2 text-xs text-zinc-500">Aucune variable</div>
        ) : (
          items.map((item, index) => (
            <button
              key={item.name}
              type="button"
              onClick={() => command({ id: item.name, label: item.label })}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm cursor-pointer flex items-center justify-between gap-2",
                index === selectedIndex
                  ? "bg-orange-500/10 text-orange-600"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
              )}
            >
              <span>{item.label}</span>
              <code className="text-[10px] text-orange-500 font-mono">{`{{ ${item.name} }}`}</code>
            </button>
          ))
        )}
      </div>
    );
  }
);
MentionList.displayName = "MentionList";

const mentionSuggestion = {
  char: "@",
  items: ({ query }: { query: string }) =>
    VARIABLES.filter((v) =>
      v.label.toLowerCase().includes(query.toLowerCase()) ||
      v.name.toLowerCase().includes(query.toLowerCase())
    ),
  render: () => {
    let component: ReactRenderer<MentionListRef>;
    let container: HTMLDivElement;

    return {
      onStart: (props: any) => {
        container = document.createElement("div");
        container.style.position = "absolute";
        container.style.zIndex = "9999";
        document.body.appendChild(container);

        component = new ReactRenderer(MentionList, {
          props: { items: props.items, command: props.command },
          editor: props.editor,
        });

        container.appendChild(component.element);

        const rect = props.clientRect?.();
        if (rect) {
          container.style.left = `${rect.left}px`;
          container.style.top = `${rect.bottom + 4}px`;
        }
      },
      onUpdate: (props: any) => {
        component?.updateProps({ items: props.items, command: props.command });
        const rect = props.clientRect?.();
        if (rect && container) {
          container.style.left = `${rect.left}px`;
          container.style.top = `${rect.bottom + 4}px`;
        }
      },
      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === "Escape") return true;
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        component?.destroy();
        container?.remove();
      },
    };
  },
};

export function RichEditor({ content, onChange, placeholder, snippets }: RichEditorProps) {
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [headingOpen, setHeadingOpen] = useState(false);
  const variablesRef = useRef<HTMLDivElement>(null);
  const snippetsRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-orange-600 underline cursor-pointer" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-2 block" },
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "bg-orange-500/10 text-orange-600 px-1 rounded font-mono text-sm",
        },
        renderText({ node }) {
          return `{{ ${node.attrs.id} }}`;
        },
        suggestion: mentionSuggestion,
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "p-4 min-h-[200px] prose prose-sm dark:prose-invert max-w-none focus:outline-none",
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

  function insertVariable(varName: string, label: string) {
    editor?.chain().focus().insertContent({
      type: "mention",
      attrs: { id: varName, label },
    }).run();
    setVariablesOpen(false);
  }

  function insertSnippet(html: string) {
    editor?.chain().focus().insertContent(html).run();
    setSnippetsOpen(false);
  }

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL du lien", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      } else {
        alert(data.error || "Erreur lors de l'upload");
      }
    } catch {
      alert("Erreur lors de l'upload de l'image");
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!editor) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="p-4 min-h-[200px]" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-t-xl flex-wrap">
        {/* Heading dropdown */}
        <div className="relative" ref={headingRef}>
          <button
            type="button"
            onClick={() => { setHeadingOpen((v) => !v); setVariablesOpen(false); setSnippetsOpen(false); }}
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition-colors cursor-pointer",
              editor.isActive("heading")
                ? "bg-orange-500/10 text-orange-600"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            )}
            title="Titre"
          >
            <Type className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>
          <Dropdown open={headingOpen} onClose={() => setHeadingOpen(false)} dropdownRef={headingRef}>
            <button type="button" onClick={() => { editor.chain().focus().setParagraph().run(); setHeadingOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2">
              <Type className="w-4 h-4" /> Paragraphe
            </button>
            <button type="button" onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setHeadingOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2">
              <Heading1 className="w-4 h-4" /> Titre 1
            </button>
            <button type="button" onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setHeadingOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2">
              <Heading2 className="w-4 h-4" /> Titre 2
            </button>
            <button type="button" onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setHeadingOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2">
              <Heading3 className="w-4 h-4" /> Titre 3
            </button>
          </Dropdown>
        </div>

        <Separator />

        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Gras">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italique">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Souligne">
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Barre">
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Lien">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Effacer le formatage">
          <RemoveFormatting className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Gauche">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centrer">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Droite">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* HR + Image */}
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Ligne horizontale">
          <Minus className="w-4 h-4" />
        </ToolbarButton>
        <label
          title="Inserer une image"
          className="p-2 rounded-lg transition-colors cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 inline-flex"
        >
          <ImagePlus className="w-4 h-4" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </label>

        <Separator />

        {/* Undo / Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler">
          <Undo2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refaire">
          <Redo2 className="w-4 h-4" />
        </ToolbarButton>

        <Separator />

        {/* Variables dropdown */}
        <div className="relative" ref={variablesRef}>
          <button
            type="button"
            onClick={() => { setVariablesOpen((v) => !v); setSnippetsOpen(false); setHeadingOpen(false); }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              variablesOpen
                ? "bg-orange-500/10 text-orange-600"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            )}
            title="Inserer une variable"
          >
            <Variable className="w-4 h-4" />
            <span className="hidden sm:inline">Variables</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <Dropdown open={variablesOpen} onClose={() => setVariablesOpen(false)} dropdownRef={variablesRef}>
            {VARIABLES.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => insertVariable(v.name, v.label)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <span className="text-zinc-700 dark:text-zinc-300">{v.label}</span>
                <code className="text-xs text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded font-mono">{`{{ ${v.name} }}`}</code>
              </button>
            ))}
          </Dropdown>
        </div>

        {/* Insert snippet dropdown */}
        {snippets && (
          <div className="relative" ref={snippetsRef}>
            <button
              type="button"
              onClick={() => { setSnippetsOpen((v) => !v); setVariablesOpen(false); setHeadingOpen(false); }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                snippetsOpen
                  ? "bg-orange-500/10 text-orange-600"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              )}
              title="Inserer un snippet"
            >
              <FileCode className="w-4 h-4" />
              <span className="hidden sm:inline">Snippets</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <Dropdown open={snippetsOpen} onClose={() => setSnippetsOpen(false)} dropdownRef={snippetsRef}>
              {snippets.length === 0 ? (
                <div className="px-3 py-3 text-xs text-zinc-500 text-center">Aucun autre snippet disponible</div>
              ) : null}
              {snippets.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => insertSnippet(s.htmlContent)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <FileCode className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-zinc-700 dark:text-zinc-300 truncate">{s.name}</span>
                </button>
              ))}
            </Dropdown>
          </div>
        )}
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}
