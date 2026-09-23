"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToolbarButton } from "./toolbar-primitives";

const WIDTH_PRESETS = [25, 50, 75, 100];

const ALIGNMENTS = [
  { value: "left", label: "Gauche", icon: AlignLeft, margin: "0 auto 0 0" },
  { value: "center", label: "Centre", icon: AlignCenter, margin: "0 auto" },
  { value: "right", label: "Droite", icon: AlignRight, margin: "0 0 0 auto" },
] as const;

/** Size slider, width presets, alignment and delete for the selected image. Always rendered on a dark surface. */
function ImageBubbleToolbar({ editor }: { editor: Editor }) {
  const [sliderValue, setSliderValue] = useState(100);

  const { state } = editor.view;
  const { from } = state.selection;
  const node = state.doc.nodeAt(from);
  if (!node || node.type.name !== "image") return null;
  const image = node;

  // Sync slider value from node attrs (deferred to avoid a render loop).
  const nodeWidth = image.attrs.width;
  const parsed = nodeWidth ? parseInt(String(nodeWidth).replace("%", "").replace("px", "")) : 100;
  if (parsed !== sliderValue) setTimeout(() => setSliderValue(parsed), 0);

  function applyWidth(width: number) {
    setSliderValue(width);
    editor.view.dispatch(state.tr.setNodeMarkup(from, undefined, { ...image.attrs, width: `${width}%` }));
  }

  function applyAlign(margin: string) {
    editor.view.dispatch(state.tr.setNodeMarkup(from, undefined, { ...image.attrs, style: `display:block;margin:${margin}` }));
  }

  return (
    <div className="dark">
      <div className="flex min-w-[260px] flex-col gap-2 rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-zinc-300 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-[10px] text-zinc-500">Taille</span>
          <Slider
            min={10}
            max={100}
            step={5}
            value={[sliderValue]}
            onValueChange={([value]) => { if (value !== undefined) applyWidth(value); }}
            aria-label="Taille de l'image"
            className="flex-1 cursor-pointer [&_[data-slot=slider-track]]:bg-zinc-700"
          />
          <span className="w-10 text-right font-mono text-[11px]">{sliderValue}%</span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {WIDTH_PRESETS.map((width) => (
            <Button
              key={width}
              type="button"
              variant="toolbar"
              size="toolbar"
              aria-label={`Largeur ${width}%`}
              aria-pressed={sliderValue === width}
              data-active={sliderValue === width ? "true" : undefined}
              onClick={() => applyWidth(width)}
              className="font-mono text-[10px] font-normal sm:h-7"
            >
              {width}%
            </Button>
          ))}
          <Separator orientation="vertical" className="mx-1 h-4 w-px bg-zinc-700" />
          {ALIGNMENTS.map(({ value, label, icon: Icon, margin }) => (
            <ToolbarButton key={value} label={`Aligner l'image : ${label}`} size="icon-xs" onClick={() => applyAlign(margin)}>
              <Icon />
            </ToolbarButton>
          ))}
          <Separator orientation="vertical" className="mx-1 h-4 w-px bg-zinc-700" />
          <ToolbarButton
            label="Supprimer l'image"
            size="icon-xs"
            variant="ghost-destructive"
            onClick={() => editor.chain().focus().deleteSelection().run()}
          >
            <Trash2 />
          </ToolbarButton>
        </div>
      </div>
    </div>
  );
}

export function ImageBubbleMenu({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu editor={editor} shouldShow={({ editor: ed }) => ed.isActive("image")} options={{ placement: "bottom", offset: 8 }}>
      <ImageBubbleToolbar editor={editor} />
    </BubbleMenu>
  );
}
