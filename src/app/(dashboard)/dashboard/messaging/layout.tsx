import { MessagingTabs } from "./messaging-tabs";

export default function MessagingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <MessagingTabs />
      {children}
    </div>
  );
}
