"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { PostHogProvider } from "@/components/PostHogProvider";
import { Toaster } from "@/components/ui/sonner";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <PostHogProvider>{children}</PostHogProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </ThemeProvider>
    </ConvexProvider>
  );
}
