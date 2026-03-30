/** Wrap HTML content in a minimal document for iframe preview rendering */
export function wrapHtmlForPreview(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    color: #d4d4d8;
    background: #09090b;
    padding: 12px;
    overflow: hidden;
  }
  img { max-width: 100%; height: auto; display: block; }
  img.mx-auto, img[style*="margin: 0 auto"], p[style*="text-align: center"] img { margin: 0 auto; }
  .block { display: block; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
  .rounded-lg { border-radius: 0.5rem; }
  p[style*="text-align: center"], div[style*="text-align: center"] { text-align: center; }
  p[style*="text-align: right"], div[style*="text-align: right"] { text-align: right; }
  a { color: #f97316; }
  h1 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
  h2 { font-size: 1.25em; font-weight: bold; margin: 0.5em 0; }
  h3 { font-size: 1.1em; font-weight: bold; margin: 0.5em 0; }
  ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
  blockquote { border-left: 3px solid #52525b; padding-left: 1em; margin: 0.5em 0; color: #a1a1aa; }
  hr { border: none; border-top: 1px solid #3f3f46; margin: 1em 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 4px 8px; border: 1px solid #3f3f46; }
  th { background: #27272a; }
  code { background: #27272a; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
  pre { background: #18181b; padding: 12px; border-radius: 6px; overflow-x: auto; }
  .mention { background: rgba(249,115,22,0.1); color: #f97316; padding: 0 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
</style>
</head>
<body>${html}</body>
</html>`;
}
