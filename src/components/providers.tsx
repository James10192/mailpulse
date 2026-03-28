"use client";

import { ThemeProvider } from "next-themes";
import { PostHogProvider } from "@/components/PostHogProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PostHogProvider>{children}</PostHogProvider>
    </ThemeProvider>
  );
}
