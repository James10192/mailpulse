/** Convert TipTap Tailwind classes to inline styles for email client compatibility */
export function inlineEmailStyles(html: string): string {
  return html
    .replace(
      /class="([^"]*\b(?:block|mx-auto|rounded-lg|my-4|max-w-full|h-auto)\b[^"]*)"/g,
      (match, classes: string) => {
        const styles: string[] = [];
        if (classes.includes("block")) styles.push("display:block");
        if (classes.includes("mx-auto")) styles.push("margin-left:auto", "margin-right:auto");
        if (classes.includes("my-4")) styles.push("margin-top:16px", "margin-bottom:16px");
        if (classes.includes("max-w-full")) styles.push("max-width:100%");
        if (classes.includes("h-auto")) styles.push("height:auto");
        if (classes.includes("rounded-lg")) styles.push("border-radius:8px");
        return styles.length > 0 ? `style="${styles.join(";")}"` : match;
      }
    )
    .replace(/class="([^"]*\btext-center\b[^"]*)"/g, 'style="text-align:center"')
    .replace(/class="([^"]*\btext-right\b[^"]*)"/g, 'style="text-align:right"');
}

/** Replace template variables and inline styles for email sending */
export function personalizeHtml(
  html: string,
  contact: { email: string; firstName: string | null; lastName: string | null }
): string {
  let result = inlineEmailStyles(html);
  result = result
    .replace(/\{\{firstName\}\}/g, contact.firstName || "")
    .replace(/\{\{lastName\}\}/g, contact.lastName || "")
    .replace(/\{\{email\}\}/g, contact.email);
  return result;
}
