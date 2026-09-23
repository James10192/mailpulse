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
import { mentionSuggestion } from "./mention-suggestion";

// Image with width/style attributes, protected so typing never replaces it:
// text input or Enter opens a paragraph after the selected image instead.
const ResizableImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, renderHTML: (attrs) => attrs.width ? { width: attrs.width } : {} },
      style: { default: null, renderHTML: (attrs) => attrs.style ? { style: attrs.style } : {} },
    };
  },
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
                view.dispatch(state.tr.insert(pos, state.schema.nodes.paragraph.create()));
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});

export function createEditorExtensions(placeholder?: string) {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    LinkExt.configure({ openOnClick: false, HTMLAttributes: { class: "text-orange-600 underline cursor-pointer" } }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Underline,
    ResizableImage.configure({
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
    Placeholder.configure({ placeholder: placeholder || "Écrivez ici... Tapez @ pour les variables" }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    CharacterCount,
  ];
}
