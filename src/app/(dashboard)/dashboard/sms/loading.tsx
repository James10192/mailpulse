import { Skeleton } from "@/components/ui/skeleton";

export default function SmsLoading() {
  return (
    <div className="page-stack app-shell-safe">
      <div className="space-y-2"><Skeleton className="h-8 w-32" /><Skeleton className="h-5 w-80" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28" />)}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-96" />
    </div>
  );
}
