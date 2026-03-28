import { SendersClient } from "./senders-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

export default function SendersPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Envoi", href: "/dashboard/senders" }, { label: "Expediteurs" }]} />
      <SendersClient />
    </>
  );
}
