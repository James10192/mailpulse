"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { RootProvider } from "fumadocs-ui/provider/next";
import { PostHogProvider } from "@/components/PostHogProvider";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RootProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </RootProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
}
