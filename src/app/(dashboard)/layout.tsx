import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin } = await getCurrentUserAndOrg();

  return <DashboardShell isAdmin={isAdmin}>{children}</DashboardShell>;
}
