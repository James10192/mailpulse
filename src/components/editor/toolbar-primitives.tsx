"use client";

import { forwardRef } from "react";
import type { Editor } from "@tiptap/react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const TOOLTIP_DELAY_MS = 300;

/**
 * Radix returns focus to the trigger when a menu closes. When the menu action has
 * just focused the editor (`chain().focus()`), keep the text cursor there instead.
 */
export function keepEditorFocus(editor: Editor) {
  return (event: Event) => {
    if (editor.isFocused) event.preventDefault();
  };
}

/**
 * Toolbar icon button with its tooltip. Works as the `asChild` target of a menu
 * trigger: the open menu highlights it through Radix's `data-state="open"`.
 */
export const ToolbarButton = forwardRef<HTMLButtonElement, ButtonProps & { label: string; active?: boolean }>(
  ({ label, active, size = "icon-sm", ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="toolbar"
          size={size}
          aria-label={label}
          data-active={active ? "true" : undefined}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  ),
);
ToolbarButton.displayName = "ToolbarButton";

/** Pressed/unpressed formatting control (bold, alignment, lists...). */
export function ToolbarToggle({ label, pressed, onToggle, children }: {
  label: string; pressed: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          variant="toolbar"
          size="icon-sm"
          pressed={pressed}
          onPressedChange={() => onToggle()}
          aria-label={label}
        >
          {children}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ToolbarSeparator() {
  return <Separator orientation="vertical" className="mx-0.5 h-5 w-px" />;
}

/** Small uppercase caption at the top of a toolbar popover. */
export function PopoverCaption({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 px-1 text-[10px] uppercase tracking-wider text-zinc-500">{children}</p>;
}
