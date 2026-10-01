"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useMailPulseConvexAuth } from "@/components/convex-auth";
import { ThemeProvider } from "next-themes";
import { PostHogProvider } from "@/components/PostHogProvider";
import { Toaster } from "@/components/ui/sonner";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useMailPulseConvexAuth}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <PostHogProvider>{children}</PostHogProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </ThemeProvider>
    </ConvexProviderWithAuth>
  );
}
