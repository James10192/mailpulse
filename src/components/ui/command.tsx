"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50", className)}
      {...props}
    />
  );
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="flex h-11 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800">
      <SearchIcon className="size-4 shrink-0 text-zinc-500" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50", className)}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn("max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto", className)}
      {...props}
    />
  );
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm text-zinc-500", className)}
      {...props}
    />
  );
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn("overflow-hidden p-1 text-zinc-950 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500 dark:text-zinc-50", className)}
      {...props}
    />
  );
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn("relative flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-950 data-[disabled=true]:opacity-50 dark:data-[selected=true]:bg-zinc-800 dark:data-[selected=true]:text-zinc-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className)}
      {...props}
    />
  );
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator data-slot="command-separator" className={cn("-mx-1 h-px bg-zinc-200 dark:bg-zinc-800", className)} {...props} />;
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
};
