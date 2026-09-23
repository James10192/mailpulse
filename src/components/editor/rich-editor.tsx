"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { useEditor, EditorContent, ReactRenderer, type Editor } from "@tiptap/react";
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
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const TOOLBAR_IDLE = "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";
const TOOLBAR_ACTIVE = "bg-orange-500/15 text-orange-600 hover:bg-orange-500/20 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-400";
const MENU_ITEM_CLASS = "cursor-pointer text-zinc-700 dark:text-zinc-300";
const POPOVER_ITEM_CLASS = "h-auto w-full justify-start gap-2 rounded-md px-3 py-1.5 text-sm font-normal active:scale-100 [&_svg]:size-3.5";
const TOOLTIP_DELAY_MS = 300;

function ToolbarTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Icon button for one-shot actions and menu triggers. */
const ToolbarButton = forwardRef<HTMLButtonElement, ButtonProps & { label: string; active?: boolean }>(
  ({ label, active, className, children, ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      className={cn("h-8 w-8 rounded-md active:scale-100 disabled:opacity-40", active ? TOOLBAR_ACTIVE : TOOLBAR_IDLE, className)}
      {...props}
    >
      {children}
    </Button>
  ),
);
ToolbarButton.displayName = "ToolbarButton";

/** Pressed/unpressed formatting control (bold, alignment, lists...). */
function ToolbarToggle({ label, pressed, onToggle, children }: {
  label: string; pressed: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <ToolbarTooltip label={label}>
      <Toggle
        size="sm"
        pressed={pressed}
        onPressedChange={() => onToggle()}
        aria-label={label}
        className={cn(
          "size-8 min-w-8 cursor-pointer rounded-md p-0",
          TOOLBAR_IDLE,
          "data-[state=on]:bg-orange-500/15 data-[state=on]:text-orange-600 dark:data-[state=on]:text-orange-400",
        )}
      >
        {children}
      </Toggle>
    </ToolbarTooltip>
  );
}

function Sep() { return <Separator orientation="vertical" className="mx-0.5 h-5 w-px" />; }

// ──────────── Mention list for @ autocomplete ────────────

interface MentionListRef { onKeyDown: (p: { event: KeyboardEvent }) => boolean; }
const MentionList = forwardRef<MentionListRef, { items: typeof VARIABLES; command: (i: { id: string; label: string }) => void }>(
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

type MentionSuggestionProps = {
  items: typeof VARIABLES;
  command: (item: { id: string; label: string }) => void;
  editor: Editor;
  clientRect?: (() => DOMRect | null) | null;
};

type MentionKeyDownProps = {
  event: KeyboardEvent;
};

const mentionSuggestion = {
  char: "@",
  items: ({ query }: { query: string }) => VARIABLES.filter((v) => v.label.toLowerCase().includes(query.toLowerCase()) || v.name.toLowerCase().includes(query.toLowerCase())),
  render: () => {
    let component: ReactRenderer<MentionListRef>;
    let container: HTMLDivElement;
    return {
      onStart: (props: MentionSuggestionProps) => {
        container = document.createElement("div"); container.style.position = "absolute"; container.style.zIndex = "9999";
        document.body.appendChild(container);
        component = new ReactRenderer(MentionList, { props: { items: props.items, command: props.command }, editor: props.editor });
        container.appendChild(component.element);
        const r = props.clientRect?.(); if (r) { container.style.left = `${r.left}px`; container.style.top = `${r.bottom + 4}px`; }
      },
      onUpdate: (props: MentionSuggestionProps) => {
        component?.updateProps({ items: props.items, command: props.command });
        const r = props.clientRect?.(); if (r && container) { container.style.left = `${r.left}px`; container.style.top = `${r.bottom + 4}px`; }
      },
      onKeyDown: (props: MentionKeyDownProps) => { if (props.event.key === "Escape") return true; return component?.ref?.onKeyDown(props) ?? false; },
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
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">Insérer un tableau</p>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${maxC}, 1fr)` }}>
        {Array.from({ length: maxR * maxC }, (_, i) => {
          const r = Math.floor(i / maxC) + 1;
          const c = (i % maxC) + 1;
          const active = r <= hover.r && c <= hover.c;
          return (
            <Button key={i} type="button" variant="ghost"
              aria-label={`Tableau ${r} x ${c}`}
              className={cn("size-6 rounded-sm border p-0 active:scale-100",
                active ? "border-orange-500 bg-orange-500/30 hover:bg-orange-500/30" : "border-zinc-200 bg-zinc-100 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-800"
              )}
              onMouseEnter={() => setHover({ r, c })}
              onFocus={() => setHover({ r, c })}
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
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const closeAll = useCallback(() => {
    setVarsOpen(false); setSnipsOpen(false); setHeadOpen(false);
    setColorOpen(false); setBgOpen(false); setFontSizeOpen(false); setTableOpen(false); setLinkOpen(false);
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
    setLinkUrl(prev || "");
    closeAll();
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl.trim() }).run();
    setLinkOpen(false);
  }

  function clearLink() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkUrl("");
    setLinkOpen(false);
  }

  async function doImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploadError("");
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) { setUploadError("Erreur upload"); return; }
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
      } else setUploadError(data.error || "Erreur upload");
    } catch { setUploadError("Erreur upload"); }
    if (fileRef.current) fileRef.current.value = "";
  }

  // Current font size display
  const currentFontSize = editor?.getAttributes("textStyle")?.fontSize as string | undefined;
  const currentFontSizeLabel = currentFontSize ? currentFontSize.replace("px", "") : "16";

  // Current color indicator
  const currentTextColor = editor?.getAttributes("textStyle")?.color as string | undefined;

  if (!editor) return <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"><div className="p-4 min-h-[200px]" /></div>;

  // Radix returns focus to the trigger on close; keep it in the editor when a toolbar action just focused it.
  const keepEditorFocus = (event: Event) => { if (editor.isFocused) event.preventDefault(); };

  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const wordCount = editor.storage.characterCount?.words() ?? 0;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {/* ─── Sticky Toolbar ─── */}
      <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <div role="toolbar" aria-label="Mise en forme" className="sticky top-0 z-30 flex items-center gap-0.5 p-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-t-xl flex-wrap">
        {/* Headings */}
        <DropdownMenu modal={false} open={headOpen} onOpenChange={(open) => { if (open) closeAll(); setHeadOpen(open); }}>
          <ToolbarTooltip label="Titre">
            <DropdownMenuTrigger asChild>
              <ToolbarButton label="Titre" active={editor.isActive("heading")}>
                <Type className="w-4 h-4" />
              </ToolbarButton>
            </DropdownMenuTrigger>
          </ToolbarTooltip>
          <DropdownMenuContent align="start" className="w-40" onCloseAutoFocus={keepEditorFocus}>
            {[
              { label: "Paragraphe", fn: () => editor.chain().focus().setParagraph().run(), icon: <Type className="w-4 h-4" /> },
              { label: "Titre 1", fn: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), icon: <Heading1 className="w-4 h-4" /> },
              { label: "Titre 2", fn: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), icon: <Heading2 className="w-4 h-4" /> },
              { label: "Titre 3", fn: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), icon: <Heading3 className="w-4 h-4" /> },
            ].map((h) => (
              <DropdownMenuItem key={h.label} onSelect={() => h.fn()} className={MENU_ITEM_CLASS}>
                {h.icon} {h.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Size */}
        <DropdownMenu modal={false} open={fontSizeOpen} onOpenChange={(open) => { if (open) closeAll(); setFontSizeOpen(open); }}>
          <ToolbarTooltip label="Taille de police">
            <DropdownMenuTrigger asChild>
              <ToolbarButton label="Taille de police" active={fontSizeOpen}
                className="w-auto min-w-10 gap-0.5 px-1.5 text-xs [&_svg]:size-3">
                <span>{currentFontSizeLabel}</span>
                <ChevronDown className="w-3 h-3" />
              </ToolbarButton>
            </DropdownMenuTrigger>
          </ToolbarTooltip>
          <DropdownMenuContent align="start" className="max-h-72 w-28 min-w-28 overflow-y-auto" onCloseAutoFocus={keepEditorFocus}>
            <DropdownMenuItem onSelect={() => editor.chain().focus().unsetFontSize().run()} className="cursor-pointer text-zinc-500">
              Par défaut
            </DropdownMenuItem>
            {FONT_SIZES.map((fs) => (
              <DropdownMenuItem key={fs.value}
                onSelect={() => editor.chain().focus().setFontSize(fs.value).run()}
                className={cn("cursor-pointer",
                  currentFontSize === fs.value ? "bg-orange-500/10 text-orange-500" : "text-zinc-700 dark:text-zinc-300"
                )}>
                {fs.label}px
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Sep />

        {/* Formatting */}
        <ToolbarToggle label="Gras" pressed={editor.isActive("bold")} onToggle={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolbarToggle>
        <ToolbarToggle label="Italique" pressed={editor.isActive("italic")} onToggle={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolbarToggle>
        <ToolbarToggle label="Souligné" pressed={editor.isActive("underline")} onToggle={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-4 h-4" /></ToolbarToggle>
        <ToolbarToggle label="Barré" pressed={editor.isActive("strike")} onToggle={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></ToolbarToggle>
        {/* Anchored rather than triggered: the link bubble menu also opens this editor through doLink. */}
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <ToolbarTooltip label="Lien">
            <PopoverAnchor asChild>
              <ToolbarButton label="Lien" active={editor.isActive("link") || linkOpen} aria-expanded={linkOpen} onClick={doLink}>
                <LinkIcon className="w-4 h-4" />
              </ToolbarButton>
            </PopoverAnchor>
          </ToolbarTooltip>
          <PopoverContent align="start" className="w-72 p-2" onCloseAutoFocus={keepEditorFocus}>
            <Label className="block text-[10px] font-normal uppercase tracking-wider text-zinc-500 dark:text-zinc-500" htmlFor="rich-editor-link-url">
              URL du lien
            </Label>
            <Input
              id="rich-editor-link-url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://..."
              className="mt-1 h-10 rounded-md px-2"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={clearLink} className="text-zinc-500">
                Retirer
              </Button>
              <Button type="button" size="sm" onClick={applyLink}>
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Sep />

        {/* Text color */}
        <Popover open={colorOpen} onOpenChange={(open) => { if (open) closeAll(); setColorOpen(open); }}>
          <ToolbarTooltip label="Couleur du texte">
            <PopoverTrigger asChild>
              <ToolbarButton label="Couleur du texte" active={colorOpen} className="relative">
                <Palette className="w-4 h-4" />
                {currentTextColor && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full" style={{ backgroundColor: currentTextColor }} />
                )}
              </ToolbarButton>
            </PopoverTrigger>
          </ToolbarTooltip>
          <PopoverContent align="start" className="w-48 p-2" onCloseAutoFocus={keepEditorFocus}>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">Couleur du texte</p>
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((c) => (
                <Button key={c} type="button" variant="ghost"
                  onClick={() => { editor.chain().focus().setColor(c).run(); setColorOpen(false); }}
                  className={cn("size-6 rounded-md border p-0 transition-transform hover:scale-110 active:scale-100",
                    currentTextColor === c ? "border-orange-500 ring-1 ring-orange-500" : "border-zinc-200 dark:border-zinc-700"
                  )}
                  style={{ backgroundColor: c }} title={c} aria-label={`Couleur ${c}`} />
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm"
              onClick={() => { editor.chain().focus().unsetColor().run(); setColorOpen(false); }}
              className="mt-2 h-auto w-full justify-start px-2 py-1 text-xs font-normal text-zinc-500 hover:bg-transparent hover:text-zinc-900 active:scale-100 dark:hover:bg-transparent dark:hover:text-zinc-100">
              Réinitialiser
            </Button>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover open={bgOpen} onOpenChange={(open) => { if (open) closeAll(); setBgOpen(open); }}>
          <ToolbarTooltip label="Surlignage">
            <PopoverTrigger asChild>
              <ToolbarButton label="Surlignage" active={bgOpen}>
                <Highlighter className="w-4 h-4" />
              </ToolbarButton>
            </PopoverTrigger>
          </ToolbarTooltip>
          <PopoverContent align="start" className="w-48 p-2" onCloseAutoFocus={keepEditorFocus}>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-1">Surlignage</p>
            <div className="grid grid-cols-6 gap-1">
              {COLORS.map((c) => (
                <Button key={c} type="button" variant="ghost"
                  onClick={() => { editor.chain().focus().toggleHighlight({ color: c }).run(); setBgOpen(false); }}
                  className="size-6 rounded-md border border-zinc-200 p-0 transition-transform hover:scale-110 active:scale-100 dark:border-zinc-700"
                  style={{ backgroundColor: c }} title={c} aria-label={`Surlignage ${c}`} />
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm"
              onClick={() => { editor.chain().focus().unsetHighlight().run(); setBgOpen(false); }}
              className="mt-2 h-auto w-full justify-start px-2 py-1 text-xs font-normal text-zinc-500 hover:bg-transparent hover:text-zinc-900 active:scale-100 dark:hover:bg-transparent dark:hover:text-zinc-100">
              Réinitialiser
            </Button>
          </PopoverContent>
        </Popover>

        <ToolbarTooltip label="Effacer la mise en forme">
          <ToolbarButton label="Effacer la mise en forme" onClick={() => editor.chain().focus().unsetAllMarks().run()}><RemoveFormatting className="w-4 h-4" /></ToolbarButton>
        </ToolbarTooltip>

        <Sep />

        {/* Alignment */}
        <ToolbarToggle label="Aligner à gauche" pressed={editor.isActive({ textAlign: "left" })} onToggle={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="w-4 h-4" /></ToolbarToggle>
        <ToolbarToggle label="Centrer" pressed={editor.isActive({ textAlign: "center" })} onToggle={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="w-4 h-4" /></ToolbarToggle>
        <ToolbarToggle label="Aligner à droite" pressed={editor.isActive({ textAlign: "right" })} onToggle={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="w-4 h-4" /></ToolbarToggle>

        <Sep />

        {/* Lists */}
        <ToolbarToggle label="Liste à puces" pressed={editor.isActive("bulletList")} onToggle={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolbarToggle>
        <ToolbarToggle label="Liste numérotée" pressed={editor.isActive("orderedList")} onToggle={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolbarToggle>
        <ToolbarToggle label="Citation" pressed={editor.isActive("blockquote")} onToggle={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolbarToggle>

        <Sep />

        {/* HR + Image + Table */}
        <ToolbarTooltip label="Ligne horizontale">
          <ToolbarButton label="Ligne horizontale" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus className="w-4 h-4" /></ToolbarButton>
        </ToolbarTooltip>
        <ToolbarTooltip label="Image">
          <ToolbarButton label="Insérer une image" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="w-4 h-4" />
          </ToolbarButton>
        </ToolbarTooltip>
        {/* Native file picker, opened programmatically by the image button above. */}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" tabIndex={-1} aria-hidden="true" onChange={doImage} />

        {/* Table */}
        <Popover open={tableOpen} onOpenChange={(open) => { if (open) closeAll(); setTableOpen(open); }}>
          <ToolbarTooltip label="Tableau">
            <PopoverTrigger asChild>
              <ToolbarButton label="Tableau" active={editor.isActive("table")}>
                <TableIcon className="w-4 h-4" />
              </ToolbarButton>
            </PopoverTrigger>
          </ToolbarTooltip>
          <PopoverContent align="start" className="w-auto p-1" onCloseAutoFocus={keepEditorFocus}>
            {editor.isActive("table") ? (
              <div className="w-48">
                {[
                  { label: "Ajouter une ligne en dessous", icon: <Plus className="w-3.5 h-3.5" />, fn: () => editor.chain().focus().addRowAfter().run() },
                  { label: "Ajouter une ligne au-dessus", icon: <RowsIcon className="w-3.5 h-3.5" />, fn: () => editor.chain().focus().addRowBefore().run() },
                  { label: "Ajouter une colonne à droite", icon: <Plus className="w-3.5 h-3.5" />, fn: () => editor.chain().focus().addColumnAfter().run() },
                  { label: "Ajouter une colonne à gauche", icon: <ColumnsIcon className="w-3.5 h-3.5" />, fn: () => editor.chain().focus().addColumnBefore().run() },
                ].map((action) => (
                  <Button key={action.label} type="button" variant="ghost"
                    onClick={() => { action.fn(); setTableOpen(false); }}
                    className={cn(POPOVER_ITEM_CLASS, "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/80")}>
                    {action.icon} {action.label}
                  </Button>
                ))}
                <Separator className="my-1" />
                {[
                  { label: "Supprimer la ligne", icon: <X className="w-3.5 h-3.5" />, fn: () => editor.chain().focus().deleteRow().run() },
                  { label: "Supprimer la colonne", icon: <X className="w-3.5 h-3.5" />, fn: () => editor.chain().focus().deleteColumn().run() },
                  { label: "Supprimer le tableau", icon: <Trash2 className="w-3.5 h-3.5" />, fn: () => editor.chain().focus().deleteTable().run() },
                ].map((action) => (
                  <Button key={action.label} type="button" variant="ghost"
                    onClick={() => { action.fn(); setTableOpen(false); }}
                    className={cn(POPOVER_ITEM_CLASS, "text-red-600 hover:bg-red-50 hover:text-red-600 dark:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-500")}>
                    {action.icon} {action.label}
                  </Button>
                ))}
              </div>
            ) : (
              <TableGridSelector
                onSelect={(rows, cols) => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()}
                onClose={() => setTableOpen(false)}
              />
            )}
          </PopoverContent>
        </Popover>

        <Sep />

        {/* Undo/Redo */}
        <ToolbarTooltip label="Annuler">
          <ToolbarButton label="Annuler" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="w-4 h-4" /></ToolbarButton>
        </ToolbarTooltip>
        <ToolbarTooltip label="Refaire">
          <ToolbarButton label="Refaire" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="w-4 h-4" /></ToolbarButton>
        </ToolbarTooltip>

        <Sep />

        {/* Variables */}
        <DropdownMenu modal={false} open={varsOpen} onOpenChange={(open) => { if (open) closeAll(); setVarsOpen(open); }}>
          <DropdownMenuTrigger asChild>
            <ToolbarButton label="Insérer une variable" active={varsOpen}
              className="w-auto gap-1 px-2 text-xs [&_svg]:size-3.5">
              <Variable className="w-3.5 h-3.5" /><span className="hidden sm:inline">Variables</span><ChevronDown className="w-3 h-3" />
            </ToolbarButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-60 overflow-y-auto" onCloseAutoFocus={keepEditorFocus}>
            {VARIABLES.map((v) => (
              <DropdownMenuItem key={v.name} onSelect={() => insertVar(v.name, v.label)}
                className="cursor-pointer justify-between">
                <span className="text-zinc-700 dark:text-zinc-300">{v.label}</span>
                <code className="text-[10px] text-orange-600 bg-orange-500/10 px-1 py-0.5 rounded font-mono">{`{{ ${v.name} }}`}</code>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Snippets */}
        {snippets && (
          <DropdownMenu modal={false} open={snipsOpen} onOpenChange={(open) => { if (open) closeAll(); setSnipsOpen(open); }}>
            <DropdownMenuTrigger asChild>
              <ToolbarButton label="Insérer un snippet" active={snipsOpen}
                className="w-auto gap-1 px-2 text-xs [&_svg]:size-3.5">
                <FileCode className="w-3.5 h-3.5" /><span className="hidden sm:inline">Snippets</span><ChevronDown className="w-3 h-3" />
              </ToolbarButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 w-56 overflow-y-auto" onCloseAutoFocus={keepEditorFocus}>
              {snippets.length === 0 ? <div className="px-3 py-2 text-xs text-zinc-500">Aucun snippet</div> : snippets.map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => insertSnip(s.htmlContent)} className="cursor-pointer">
                  <FileCode className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-zinc-700 dark:text-zinc-300 truncate">{s.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      </TooltipProvider>

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
          <Button type="button" variant="ghost" size="icon" title="Ouvrir" aria-label="Ouvrir le lien"
            onClick={() => window.open(editor.getAttributes("link").href, "_blank")}
            className="size-6 rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 active:scale-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 [&_svg]:size-3.5">
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" title="Modifier" aria-label="Modifier le lien" onClick={doLink}
            className="size-6 rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 active:scale-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 [&_svg]:size-3.5">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" title="Supprimer le lien" aria-label="Supprimer le lien"
            onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
            className="size-6 rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-500 active:scale-100 dark:hover:bg-red-950/30 dark:hover:text-red-500 [&_svg]:size-3.5">
            <Unlink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </BubbleMenu>

      {/* ─── Image Bubble Menu ─── */}
      <BubbleMenu editor={editor}
        shouldShow={({ editor: ed }) => ed.isActive("image")}
        options={{ placement: "bottom", offset: 8 }}
      >
        <ImageBubbleToolbar editor={editor} />
      </BubbleMenu>

      {/* ─── Editor Content ─── */}
      {uploadError ? (
        <div className="mx-3 mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {uploadError}
        </div>
      ) : null}
      <EditorContent editor={editor} />

      {/* ─── Character / Word Count ─── */}
      <div className="flex items-center justify-end gap-3 px-3 py-1.5 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400 font-mono">
        <span>{charCount} caractère{charCount !== 1 ? "s" : ""}</span>
        <span>{wordCount} mot{wordCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

/* ─── Image Bubble Toolbar ─── */

function ImageBubbleToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [sliderValue, setSliderValue] = useState(100);

  if (!editor) return null;

  const { state } = editor.view;
  const { from } = state.selection;
  const node = state.doc.nodeAt(from);
  const isImage = node?.type.name === "image";

  // Sync slider value from node attrs
  const nodeWidth = isImage ? node.attrs.width : null;
  const parsed = nodeWidth ? parseInt(String(nodeWidth).replace("%", "").replace("px", "")) : 100;
  if (parsed !== sliderValue && isImage) {
    // Only update if different — avoid infinite loop
    setTimeout(() => setSliderValue(parsed), 0);
  }

  function applyWidth(w: number) {
    if (!isImage) return;
    setSliderValue(w);
    editor!.view.dispatch(
      state.tr.setNodeMarkup(from, undefined, { ...node!.attrs, width: `${w}%` })
    );
  }

  function applyAlign(align: "left" | "center" | "right") {
    if (!isImage) return;
    const margin = align === "center" ? "0 auto" : align === "right" ? "0 0 0 auto" : "0 auto 0 0";
    editor!.view.dispatch(
      state.tr.setNodeMarkup(from, undefined, { ...node!.attrs, style: `display:block;margin:${margin}` })
    );
  }

  if (!isImage) return null;

  return (
    <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl min-w-[260px]">
      {/* Slider */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-500 w-10 shrink-0">Taille</span>
        <Slider
          min={10}
          max={100}
          step={5}
          value={[sliderValue]}
          onValueChange={([value]) => { if (value !== undefined) applyWidth(value); }}
          aria-label="Taille de l'image"
          className="flex-1 cursor-pointer [&_[data-slot=slider-track]]:bg-zinc-700"
        />
        <span className="text-[11px] font-mono text-zinc-300 w-10 text-right">{sliderValue}%</span>
      </div>

      {/* Presets + alignment + delete */}
      <div className="flex items-center gap-1">
        {[25, 50, 75, 100].map((w) => (
          <Button key={w} type="button" variant="ghost" title={`${w}%`} aria-label={`Largeur ${w}%`}
            onClick={() => applyWidth(w)}
            className={cn(
              "h-auto rounded px-1.5 py-0.5 font-mono text-[10px] font-normal active:scale-100",
              sliderValue === w ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/20 hover:text-orange-400 dark:text-orange-400 dark:hover:bg-orange-500/20 dark:hover:text-orange-400" : "text-zinc-500 hover:bg-zinc-700 hover:text-white dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-white"
            )}>
            {w}%
          </Button>
        ))}
        <Separator orientation="vertical" className="mx-1 h-4 w-px bg-zinc-700 dark:bg-zinc-700" />
        {(["left", "center", "right"] as const).map((align) => {
          const label = align === "left" ? "Gauche" : align === "center" ? "Centre" : "Droite";
          return (
            <Button key={align} type="button" variant="ghost" size="icon" title={label} aria-label={`Aligner l'image : ${label}`}
              onClick={() => applyAlign(align)}
              className="size-5 rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white active:scale-100 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white [&_svg]:size-3">
              {align === "left" ? <AlignLeft className="w-3 h-3" /> : align === "center" ? <AlignCenter className="w-3 h-3" /> : <AlignRight className="w-3 h-3" />}
            </Button>
          );
        })}
        <Separator orientation="vertical" className="mx-1 h-4 w-px bg-zinc-700 dark:bg-zinc-700" />
        <Button type="button" variant="ghost" size="icon" title="Supprimer" aria-label="Supprimer l'image"
          onClick={() => editor!.chain().focus().deleteSelection().run()}
          className="size-5 rounded p-1 text-red-400 hover:bg-red-500/20 hover:text-red-300 active:scale-100 dark:text-red-400 dark:hover:bg-red-500/20 dark:hover:text-red-300 [&_svg]:size-3">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
