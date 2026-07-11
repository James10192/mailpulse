export function htmlToPlainText(content: string | null | undefined) {
  if (!content) return "";

  return content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(content: string | null | undefined) {
  const text = htmlToPlainText(content);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}
