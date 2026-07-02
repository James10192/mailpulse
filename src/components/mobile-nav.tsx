"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import type { NavItem } from "@/components/dashboard/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNav({ navigation }: { navigation: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{ viewTransitionName: "persistent-mobile-nav" }}
      className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 text-zinc-900 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-100 md:hidden"
    >
      <BrandMark href="/dashboard" className="text-base" />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Ouvrir le menu"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
          <SheetHeader className="border-b border-zinc-200 dark:border-zinc-800">
            <SheetTitle asChild>
              <BrandMark href="/dashboard" className="text-base" />
            </SheetTitle>
          </SheetHeader>
          <nav className="space-y-0.5 p-3">
            {navigation.map((item) => (
              <MobileNavItem
                key={item.href}
                item={item}
                pathname={pathname}
                onSelect={() => setOpen(false)}
              />
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MobileNavItem({
  item,
  pathname,
  onSelect,
}: {
  item: NavItem;
  pathname: string;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));

  return (
    <div>
      <Button
        asChild
        variant="ghost"
        className={cn(
          "h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm",
          isActive
            ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        )}
      >
        <Link href={item.href} onClick={onSelect}>
          <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.name}</span>
          {item.pro && (
            <Badge variant="default" className="ml-auto px-1 py-0 text-[8px] uppercase">
              Pro
            </Badge>
          )}
        </Link>
      </Button>
      {item.children && item.children.length > 0 ? (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-zinc-200 pl-2 dark:border-zinc-800">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            const childActive = pathname === child.href;

            return (
              <Button
                key={child.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "h-9 w-full justify-start gap-2.5 px-2.5 text-xs",
                  childActive
                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                <Link href={child.href} onClick={onSelect}>
                  <ChildIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">{child.name}</span>
                  {child.pro && (
                    <Badge variant="default" className="ml-auto px-1 py-0 text-[7px] uppercase">
                      Pro
                    </Badge>
                  )}
                </Link>
              </Button>
            );
          })}
          <Separator className="my-1" />
        </div>
      ) : null}
    </div>
  );
}
