"use client";

import type { Editor } from "@tiptap/react";
import { Highlighter, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { COLORS } from "./editor-config";
import { PopoverCaption, ToolbarButton, useEditorFocusReturn } from "./toolbar-primitives";

const SWATCH_CLASS = "size-6 rounded-md border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35";

const MODES = {
  text: {
    label: "Couleur du texte",
    swatchLabel: "Couleur",
    icon: Palette,
    apply: (editor: Editor, color: string) => editor.chain().focus().setColor(color).run(),
    reset: (editor: Editor) => editor.chain().focus().unsetColor().run(),
  },
  highlight: {
    label: "Surlignage",
    swatchLabel: "Surlignage",
    icon: Highlighter,
    apply: (editor: Editor, color: string) => editor.chain().focus().toggleHighlight({ color }).run(),
    reset: (editor: Editor) => editor.chain().focus().unsetHighlight().run(),
  },
} as const;

/** Colour palette popover for the text colour or the highlight. Each swatch closes it through PopoverClose. */
export function ColorPopover({ editor, mode, currentColor }: { editor: Editor; mode: keyof typeof MODES; currentColor?: string | null }) {
  const config = MODES[mode];
  const Icon = config.icon;
  const focus = useEditorFocusReturn(editor);
  const currentTextColor = mode === "text" ? currentColor : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton label={config.label} className="relative">
          <Icon />
          {currentTextColor ? (
            <span className="absolute bottom-0.5 left-1/2 h-0.5 w-3 -translate-x-1/2 rounded-full" style={{ backgroundColor: currentTextColor }} />
          ) : null}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-2" onCloseAutoFocus={focus.onCloseAutoFocus}>
        <PopoverCaption>{config.label}</PopoverCaption>
        <div className="grid grid-cols-6 gap-1">
          {COLORS.map((color) => (
            <PopoverClose key={color} asChild>
              <button
                type="button"
                onClick={() => focus.run(() => config.apply(editor, color))}
                className={cn(
                  SWATCH_CLASS,
                  currentTextColor === color ? "border-orange-500 ring-1 ring-orange-500" : "border-zinc-200 dark:border-zinc-700",
                )}
                style={{ backgroundColor: color }}
                title={color}
                aria-label={`${config.swatchLabel} ${color}`}
              />
            </PopoverClose>
          ))}
        </div>
        <PopoverClose asChild>
          <Button type="button" variant="ghost" size="sm" onClick={() => focus.run(() => config.reset(editor))} className="mt-2 w-full justify-start font-normal text-zinc-500">
            Réinitialiser
          </Button>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}
