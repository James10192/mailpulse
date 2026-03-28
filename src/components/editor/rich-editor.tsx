"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Plugin, PluginKey, NodeSelection, TextSelection } from "@tiptap/pm/state";
import { StarterKit } from "@tiptap/starter-kit";
import { Link as LinkExt } from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { Underline } from "@tiptap/extension-underline";
import { Image as ImageExt } from "@tiptap/extension-image";
import { Mention } from "@tiptap/extension-mention";
import { Color } from "@tiptap/extension-color";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { CharacterCount } from "@tiptap/extension-character-count";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Link as LinkIcon, Unlink, ExternalLink, Pencil,
  RemoveFormatting, AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, ChevronDown, Variable, Minus, ImagePlus,
  Heading1, Heading2, Heading3, FileCode, Type, Palette, Highlighter,
  List, ListOrdered, Quote, TableIcon, Trash2,
  Plus, RowsIcon, ColumnsIcon, X,
} from "lucide-react";

// ──────────── Types ────────────

interface SnippetOption { id: string; name: string; htmlContent: string; }
interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  snippets?: SnippetOption[];
}

// ──────────── Constants ────────────

const VARIABLES = [
  { name: "email", label: "Email du contact" },
  { name: "name", label: "Nom du contact" },
  { name: "firstName", label: "Prenom" },
  { name: "lastName", label: "Nom de famille" },
  { name: "tags", label: "Tags du contact" },
  { name: "currentTime", label: "Date actuelle" },
  { name: "unsubscribeUrl", label: "Lien desinscription" },
  { name: "viewOnlineUrl", label: "Voir en ligne" },
];

const COLORS = [
  "#000000", "#374151", "#6B7280", "#EF4444", "#F97316", "#F59E0B",
  "#10B981", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#FFFFFF",
];

const FONT_SIZES = [
  { label: "12", value: "12px" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
  { label: "32", value: "32px" },
  { label: "36", value: "36px" },
  { label: "48", value: "48px" },
];

// ──────────── Shared UI ────────────

function Btn({ onClick, active, disabled, title, children, className: cls }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={cn("p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-40",
        active ? "bg-orange-500/20 text-orange-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800",
        cls,
      )}>
      {children}
    </button>
  );
}

function Sep() { return <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-0.5 shrink-0" />; }

// Dropdown wrapper
function Drop({ open, onClose, children, dropRef }: {
  open: boolean; onClose: () => void; children: React.ReactNode; dropRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose, dropRef]);
  if (!open) return null;
  return (
    <div className="absolute left-0 z-50 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl py-1 max-h-72 overflow-y-auto bottom-full mb-1 sm:bottom-auto sm:mb-0 sm:top-full sm:mt-1">
      {children}
    </div>
  );
}

// ──────────── Mention list for @ autocomplete ────────────

interface MentionListRef { onKeyDown: (p: { event: KeyboardEvent }) => boolean; }
const MentionList = forwardRef<MentionListRef, { items: typeof VARIABLES; command: (i: { id: string; label: string }) => void }>(
  ({ items, command }, ref) => {
    const [sel, setSel] = useState(0);
    useEffect(() => setSel(0), [items]);
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") { setSel((i) => (i + items.length - 1) % items.length); return true; }
        if (event.key === "ArrowDown") { setSel((i) => (i + 1) % items.length); return true; }
        if (event.key === "Enter") { const it = items[sel]; if (it) command({ id: it.name, label: it.label }); return true; }
        return false;
      },
    }), [items, sel, command]);
    return (
      <div className="z-50 w-56 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl py-1 max-h-48 overflow-y-auto">
        {items.length === 0 ? <div className="px-3 py-2 text-xs text-zinc-500">Aucune variable</div> : items.map((it, i) => (
          <button key={it.name} type="button" onClick={() => command({ id: it.name, label: it.label })}
            className={cn("w-full text-left px-3 py-1.5 text-sm cursor-pointer flex items-center justify-between gap-2",
              i === sel ? "bg-orange-500/10 text-orange-600" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
            )}>
            <span>{it.label}</span>
            <code className="text-[10px] text-orange-500 font-mono">{`{{ ${it.name} }}`}</code>
          </button>
        ))}
      </div>
    );
  }
);
MentionList.displayName = "MentionList";

const mentionSuggestion = {
  char: "@",
  items: ({ query }: { query: string }) => VARIABLES.filter((v) => v.label.toLowerCase().includes(query.toLowerCase()) || v.name.toLowerCase().includes(query.toLowerCase())),
  render: () => {
    let component: ReactRenderer<MentionListRef>;
    let container: HTMLDivElement;
    return {
      onStart: (props: any) => {
        container = document.createElement("div"); container.style.position = "absolute"; container.style.zIndex = "9999";
        document.body.appendChild(container);
        component = new ReactRenderer(MentionList, { props: { items: props.items, command: props.command }, editor: props.editor });
        container.appendChild(component.element);
        const r = props.clientRect?.(); if (r) { container.style.left = `${r.left}px`; container.style.top = `${r.bottom + 4}px`; }
      },
      onUpdate: (props: any) => {
        component?.updateProps({ items: props.items, command: props.command });
        const r = props.clientRect?.(); if (r && container) { container.style.left = `${r.left}px`; container.style.top = `${r.bottom + 4}px`; }
      },
      onKeyDown: (props: any) => { if (props.event.key === "Escape") return true; return component?.ref?.onKeyDown(props) ?? false; },
      onExit: () => { component?.destroy(); container?.remove(); },
    };
  },
};

// ──────────── Table Grid Selector ────────────

function TableGridSelector({ onSelect, onClose }: { onSelect: (rows: number, cols: number) => void; onClose: () => void }) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const maxR = 6, maxC = 6;

  return (
    <div className="w-48 p-2">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">Inserer un tableau</p>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${maxC}, 1fr)` }}>
        {Array.from({ length: maxR * maxC }, (_, i) => {
          const r = Math.floor(i / maxC) + 1;
          const c = (i % maxC) + 1;
          const active = r <= hover.r && c <= hover.c;
          return (
            <button key={i} type="button"
              className={cn("w-6 h-6 rounded-sm border cursor-pointer transition-colors",
                active ? "bg-orange-500/30 border-orange-500" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              )}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => { onSelect(r, c); onClose(); }}
            />
          );
        })}
      </div>
      {hover.r > 0 && (
        <p className="text-xs text-zinc-500 text-center mt-1.5">{hover.r} x {hover.c}</p>
      )}
    </div>
  );
}

// ──────────── Main Editor ────────────

export function RichEditor({ content, onChange, placeholder, snippets }: RichEditorProps) {
  const [varsOpen, setVarsOpen] = useState(false);
  const [snipsOpen, setSnipsOpen] = useState(false);
  const [headOpen, setHeadOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const varsRef = useRef<HTMLDivElement>(null);
  const snipsRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const closeAll = useCallback(() => {
    setVarsOpen(false); setSnipsOpen(false); setHeadOpen(false);
    setColorOpen(false); setBgOpen(false); setFontSizeOpen(false); setTableOpen(false);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: "text-orange-600 underline cursor-pointer" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      ImageExt.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: { default: null, renderHTML: (attrs) => attrs.width ? { width: attrs.width } : {} },
            style: { default: null, renderHTML: (attrs) => attrs.style ? { style: attrs.style } : {} },
          };
        },
        // Prevent typing from replacing the image — move cursor after image instead
        addProseMirrorPlugins() {
          return [
            new Plugin({
              key: new PluginKey("imageProtect"),
              props: {
                handleTextInput(view, _from, _to, text) {
                  const { state } = view;
                  if (state.selection instanceof NodeSelection && state.selection.node.type.name === "image") {
                    const pos = state.selection.from + state.selection.node.nodeSize;
                    let tr = state.tr.insert(pos, state.schema.nodes.paragraph.create(null, state.schema.text(text)));
                    // Resolve position in the new document after insert
                    const resolvedPos = tr.doc.resolve(pos + 1 + text.length);
                    tr = tr.setSelection(TextSelection.create(tr.doc, resolvedPos.pos));
                    view.dispatch(tr);
                    return true;
                  }
                  return false;
                },
                handleKeyDown(view, event) {
                  const { state } = view;
                  if (state.selection instanceof NodeSelection && state.selection.node.type.name === "image") {
                    // On Delete/Backspace with image selected, allow default behavior (delete image)
                    if (event.key === "Delete" || event.key === "Backspace") return false;
                    // On Enter, create paragraph after image and move cursor there
                    if (event.key === "Enter") {
                      const pos = state.selection.from + state.selection.node.nodeSize;
                      const tr = state.tr.insert(pos, state.schema.nodes.paragraph.create());
                      view.dispatch(tr);
                      return true;
                    }
                  }
                  return false;
                },
              },
            }),
          ];
        },
      }).configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto my-4 block mx-auto" },
      }),
      Mention.configure({
        HTMLAttributes: { class: "bg-orange-500/10 text-orange-600 px-1 rounded font-mono text-sm" },
        renderText({ node }) { return `{{ ${node.attrs.id} }}`; },
        suggestion: mentionSuggestion,
      }),
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: placeholder || "Ecrivez ici... Tapez @ pour les variables" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      CharacterCount,
    ],
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

  function insertVar(name: string, label: string) {
    editor?.chain().focus().insertContent({ type: "mention", attrs: { id: name, label } }).run();
    setVarsOpen(false);
  }
  function insertSnip(html: string) { editor?.chain().focus().insertContent(html).run(); setSnipsOpen(false); }

  function doLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL du lien", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function doImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) { alert("Erreur upload"); return; }
      const data = await res.json();
      if (data.url) {
        // Insert image as a new block after current position (never replaces selection)
        const endPos = editor.state.selection.$to.pos;
        editor.chain().focus()
          .insertContentAt(endPos, [
            { type: "image", attrs: { src: data.url, alt: file.name } },
            { type: "paragraph" },
          ])
          .run();
      } else alert(data.error || "Erreur upload");
    } catch { alert("Erreur upload"); }
    if (fileRef.current) fileRef.current.value = "";
  }

  // Current font size display
  const currentFontSize = editor?.getAttributes("textStyle")?.fontSize as string | undefined;
  const currentFontSizeLabel = currentFontSize ? currentFontSize.replace("px", "") : "16";

  // Current color indicator
  const currentTextColor = editor?.getAttributes("textStyle")?.color as string | undefined;

  if (!editor) return <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"><div className="p-4 min-h-[200px]" /></div>;

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {/* ─── Sticky Toolbar ─── */}
      <div className="sticky top-0 z-30 flex items-center gap-0.5 p-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-t-xl flex-wrap">
        {/* Headings */}
        <div className="relative" ref={headRef}>
          <Btn onClick={() => { closeAll(); setHeadOpen(!headOpen); }} active={editor.isActive("heading")} title="Titre">
            <Type className="w-4 h-4" />
          </Btn>
          <Drop open={headOpen} onClose={() => setHeadOpen(false)} dropRef={headRef}>
            <div className="w-40">
              {[
                { label: "Paragraphe", fn: () => editor.chain().focus().setParagraph().run(), icon: <Type className="w-4 h-4" /> },
                { label: "Titre 1", fn: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), icon: <Heading1 className="w-4 h-4" /> },
                { label: "Titre 2", fn: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), icon: <Heading2 className="w-4 h-4" /> },
                { label: "Titre 3", fn: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), icon: <Heading3 className="w-4 h-4" /> },
              ].map((h) => (
                <button key={h.label} type="button" onClick={() => { h.fn(); setHeadOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  {h.icon} {h.label}
                </button>
              ))}
            </div>
          </Drop>
        </div>

        {/* Font Size */}
        <div className="relative" ref={fontSizeRef}>
          <button type="button" onClick={() => { closeAll(); setFontSizeOpen(!fontSizeOpen); }} title="Taille de police"
            className={cn("flex items-center gap-0.5 px-1.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer min-w-[40px] justify-center",
              fontSizeOpen ? "bg-orange-500/20 text-orange-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            )}>
            <span>{currentFontSizeLabel}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <Drop open={fontSizeOpen} onClose={() => setFontSizeOpen(false)} dropRef={fontSizeRef}>
            <div className="w-28">
              <button type="button" onClick={() => { editor.chain().focus().unsetFontSize().run(); setFontSizeOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer text-zinc-500">
                Par defaut
              </button>
              {FONT_SIZES.map((fs) => (
                <button key={fs.value} type="button"
                  onClick={() => { editor.chain().focus().setFontSize(fs.value).run(); setFontSizeOpen(false); }}
                  className={cn("w-full text-left px-3 py-1.5 text-sm cursor-pointer",
                    currentFontSize === fs.value ? "bg-orange-500/10 text-orange-500" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                  )}>
                  {fs.label}px
                </button>
              ))}
            </div>
          </Drop>
        </div>

        <Sep />

        {/* Formatting */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Gras"><Bold className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italique"><Italic className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Souligne"><UnderlineIcon className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Barre"><Strikethrough className="w-4 h-4" /></Btn>
        <Btn onClick={doLink} active={editor.isActive("link")} title="Lien"><LinkIcon className="w-4 h-4" /></Btn>

        <Sep />

        {/* Text color */}
        <div className="relative" ref={colorRef}>
          <button type="button" onClick={() => { closeAll(); setColorOpen(!colorOpen); }} title="Couleur du texte"
            className={cn("p-1.5 rounded-md transition-colors cursor-pointer relative",
              colorOpen ? "bg-orange-500/20 text-orange-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            )}>
            <Palette className="w-4 h-4" />
            {currentTextColor && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full" style={{ backgroundColor: currentTextColor }} />
            )}
          </button>
          <Drop open={colorOpen} onClose={() => setColorOpen(false)} dropRef={colorRef}>
            <div className="w-48 p-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">Couleur du texte</p>
              <div className="grid grid-cols-6 gap-1">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => { editor.chain().focus().setColor(c).run(); setColorOpen(false); }}
                    className={cn("w-6 h-6 rounded-md border cursor-pointer hover:scale-110 transition-transform",
                      currentTextColor === c ? "border-orange-500 ring-1 ring-orange-500" : "border-zinc-200 dark:border-zinc-700"
                    )}
                    style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
              <button type="button" onClick={() => { editor.chain().focus().unsetColor().run(); setColorOpen(false); }}
                className="mt-2 w-full text-left px-2 py-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">
                Reinitialiser
              </button>
            </div>
          </Drop>
        </div>

        {/* Highlight */}
        <div className="relative" ref={bgRef}>
          <Btn onClick={() => { closeAll(); setBgOpen(!bgOpen); }} title="Surlignage"><Highlighter className="w-4 h-4" /></Btn>
          <Drop open={bgOpen} onClose={() => setBgOpen(false)} dropRef={bgRef}>
            <div className="w-48 p-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">Surlignage</p>
              <div className="grid grid-cols-6 gap-1">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setBgOpen(false); }}
                    className="w-6 h-6 rounded-md border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
              <button type="button" onClick={() => { editor.chain().focus().unsetHighlight().run(); setBgOpen(false); }}
                className="mt-2 w-full text-left px-2 py-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">
                Reinitialiser
              </button>
            </div>
          </Drop>
        </div>

        <Btn onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Effacer formatage"><RemoveFormatting className="w-4 h-4" /></Btn>

        <Sep />

        {/* Alignment */}
        <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Gauche"><AlignLeft className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centrer"><AlignCenter className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Droite"><AlignRight className="w-4 h-4" /></Btn>

        <Sep />

        {/* Lists */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Liste a puces"><List className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Liste numerotee"><ListOrdered className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citation"><Quote className="w-4 h-4" /></Btn>

        <Sep />

        {/* HR + Image + Table */}
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Ligne horizontale"><Minus className="w-4 h-4" /></Btn>
        <label title="Image" className="p-1.5 rounded-md transition-colors cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 inline-flex relative overflow-hidden">
          <ImagePlus className="w-4 h-4" />
          <input ref={fileRef} type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={doImage} />
        </label>

        {/* Table */}
        <div className="relative" ref={tableRef}>
          <Btn onClick={() => { closeAll(); setTableOpen(!tableOpen); }} active={editor.isActive("table")} title="Tableau">
            <TableIcon className="w-4 h-4" />
          </Btn>
          <Drop open={tableOpen} onClose={() => setTableOpen(false)} dropRef={tableRef}>
            {editor.isActive("table") ? (
              <div className="w-48 p-1">
                <button type="button" onClick={() => { editor.chain().focus().addRowAfter().run(); setTableOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Plus className="w-3.5 h-3.5" /> Ajouter ligne en dessous
                </button>
                <button type="button" onClick={() => { editor.chain().focus().addRowBefore().run(); setTableOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <RowsIcon className="w-3.5 h-3.5" /> Ajouter ligne au dessus
                </button>
                <button type="button" onClick={() => { editor.chain().focus().addColumnAfter().run(); setTableOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Plus className="w-3.5 h-3.5" /> Ajouter colonne a droite
                </button>
                <button type="button" onClick={() => { editor.chain().focus().addColumnBefore().run(); setTableOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <ColumnsIcon className="w-3.5 h-3.5" /> Ajouter colonne a gauche
                </button>
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                <button type="button" onClick={() => { editor.chain().focus().deleteRow().run(); setTableOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer flex items-center gap-2 text-red-600">
                  <X className="w-3.5 h-3.5" /> Supprimer ligne
                </button>
                <button type="button" onClick={() => { editor.chain().focus().deleteColumn().run(); setTableOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer flex items-center gap-2 text-red-600">
                  <X className="w-3.5 h-3.5" /> Supprimer colonne
                </button>
                <button type="button" onClick={() => { editor.chain().focus().deleteTable().run(); setTableOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer flex items-center gap-2 text-red-600">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer tableau
                </button>
              </div>
            ) : (
              <TableGridSelector
                onSelect={(rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()}
                onClose={() => setTableOpen(false)}
              />
            )}
          </Drop>
        </div>

        <Sep />

        {/* Undo/Redo */}
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler"><Undo2 className="w-4 h-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refaire"><Redo2 className="w-4 h-4" /></Btn>

        <Sep />

        {/* Variables */}
        <div className="relative" ref={varsRef}>
          <button type="button" onClick={() => { closeAll(); setVarsOpen(!varsOpen); }}
            className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
              varsOpen ? "bg-orange-500/20 text-orange-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            )}>
            <Variable className="w-3.5 h-3.5" /><span className="hidden sm:inline">Variables</span><ChevronDown className="w-3 h-3" />
          </button>
          <Drop open={varsOpen} onClose={() => setVarsOpen(false)} dropRef={varsRef}>
            <div className="w-60">
              {VARIABLES.map((v) => (
                <button key={v.name} type="button" onClick={() => insertVar(v.name, v.label)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center justify-between gap-2">
                  <span className="text-zinc-700 dark:text-zinc-300">{v.label}</span>
                  <code className="text-[10px] text-orange-600 bg-orange-500/10 px-1 py-0.5 rounded font-mono">{`{{ ${v.name} }}`}</code>
                </button>
              ))}
            </div>
          </Drop>
        </div>

        {/* Snippets */}
        {snippets && (
          <div className="relative" ref={snipsRef}>
            <button type="button" onClick={() => { closeAll(); setSnipsOpen(!snipsOpen); }}
              className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                snipsOpen ? "bg-orange-500/20 text-orange-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              )}>
              <FileCode className="w-3.5 h-3.5" /><span className="hidden sm:inline">Snippets</span><ChevronDown className="w-3 h-3" />
            </button>
            <Drop open={snipsOpen} onClose={() => setSnipsOpen(false)} dropRef={snipsRef}>
              <div className="w-56">
                {snippets.length === 0 ? <div className="px-3 py-2 text-xs text-zinc-500">Aucun snippet</div> : snippets.map((s) => (
                  <button key={s.id} type="button" onClick={() => insertSnip(s.htmlContent)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="text-zinc-700 dark:text-zinc-300 truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </Drop>
          </div>
        )}
      </div>

      {/* ─── Link Bubble Menu ─── */}
      <BubbleMenu editor={editor}
        shouldShow={({ editor: ed }) => ed.isActive("link") && !ed.isActive("image")}
      >
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl text-sm">
          <a
            href={editor.getAttributes("link").href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-600 hover:text-orange-500 underline truncate max-w-[200px] cursor-pointer text-xs"
          >
            {editor.getAttributes("link").href}
          </a>
          <button type="button" title="Ouvrir" onClick={() => window.open(editor.getAttributes("link").href, "_blank")}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Modifier" onClick={doLink}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Supprimer le lien" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer text-red-500">
            <Unlink className="w-3.5 h-3.5" />
          </button>
        </div>
      </BubbleMenu>

      {/* ─── Image Bubble Menu ─── */}
      <BubbleMenu editor={editor}
        shouldShow={({ editor: ed }) => ed.isActive("image")}
        options={{ placement: "bottom", offset: 8 }}
      >
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
          {/* Width presets */}
          {[25, 50, 75, 100].map((w) => (
            <button key={w} type="button" title={`Largeur ${w}%`}
              onClick={() => {
                const { state, dispatch } = editor.view;
                const { from } = state.selection;
                const node = state.doc.nodeAt(from);
                if (node?.type.name === "image") {
                  dispatch(state.tr.setNodeMarkup(from, undefined, { ...node.attrs, width: `${w}%` }));
                }
              }}
              className="px-2 py-1 rounded text-xs font-mono cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
              {w}%
            </button>
          ))}
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          {/* Alignment */}
          {(["left", "center", "right"] as const).map((align) => (
            <button key={align} type="button" title={`Aligner ${align === "left" ? "a gauche" : align === "center" ? "au centre" : "a droite"}`}
              onClick={() => {
                const { state, dispatch } = editor.view;
                const { from } = state.selection;
                const node = state.doc.nodeAt(from);
                if (node?.type.name === "image") {
                  dispatch(state.tr.setNodeMarkup(from, undefined, { ...node.attrs, style: `display:block;margin:${align === "center" ? "0 auto" : align === "right" ? "0 0 0 auto" : "0 auto 0 0"}` }));
                }
              }}
              className={cn("p-1 rounded cursor-pointer transition-colors text-zinc-400 hover:text-white hover:bg-zinc-700")}>
              {align === "left" ? <AlignLeft className="w-3.5 h-3.5" /> : align === "center" ? <AlignCenter className="w-3.5 h-3.5" /> : <AlignRight className="w-3.5 h-3.5" />}
            </button>
          ))}
          <div className="w-px h-4 bg-zinc-700 mx-1" />
          {/* Delete */}
          <button type="button" title="Supprimer l'image"
            onClick={() => editor.chain().focus().deleteSelection().run()}
            className="p-1 rounded hover:bg-red-500/20 cursor-pointer text-red-400 hover:text-red-300">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </BubbleMenu>

      {/* ─── Editor Content ─── */}
      <EditorContent editor={editor} />

      {/* ─── Character / Word Count ─── */}
      <div className="flex items-center justify-end gap-3 px-3 py-1.5 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400 font-mono">
        <span>{charCount} caractere{charCount !== 1 ? "s" : ""}</span>
        <span>{wordCount} mot{wordCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
