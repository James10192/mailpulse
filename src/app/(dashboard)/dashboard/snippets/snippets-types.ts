export type SnippetChannel = "EMAIL" | "WHATSAPP" | "SMS";
export type SnippetSort = "date-desc" | "date-asc" | "name-asc" | "content-desc";

export type Snippet = {
  id: string;
  name: string;
  description: string | null;
  htmlContent: string;
  channel: SnippetChannel;
  createdAt: string;
};

export const channelLabels: Record<SnippetChannel, string> = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
};

export function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function getWordCount(snippet: Snippet) {
  const text = getPlainText(snippet.htmlContent);
  if (!text) return 0;
  return text.split(/\s+/).length;
}

export function getCharacterCount(snippet: Snippet) {
  return getPlainText(snippet.htmlContent).length;
}

export function hasContent(snippet: Snippet) {
  return getCharacterCount(snippet) > 0;
}
