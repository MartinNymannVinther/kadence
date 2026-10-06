/**
 * Escapes text for the downloaded programme (docs/plan-ovelser-og-programmer.md):
 * every exercise name, every "how" and "why", and a team's free text, goes
 * through this on the way into the file. Enough to be safe inside an HTML
 * text node or a double-quoted attribute; nothing here is ever placed
 * inside the file's own `<script>` unescaped (download-script.ts carries
 * only a JSON-encoded, further-escaped key).
 *
 * Pure.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]!);
}
