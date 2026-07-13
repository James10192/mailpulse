import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin } = await getCurrentUserAndOrg();

  return <DashboardShell isAdmin={isAdmin}>{children}</DashboardShell>;
}
