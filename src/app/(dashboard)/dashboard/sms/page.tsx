import { redirect } from "next/navigation";

// SMS now lives beside WhatsApp, under Messagerie. Old links and bookmarks land there.
export default function SmsRedirect() {
  redirect("/dashboard/messaging/sms");
}
