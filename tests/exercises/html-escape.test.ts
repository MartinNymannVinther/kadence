import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/modules/exercises/html-escape";

describe("escapeHtml", () => {
  it("escapes the five characters that matter in a text node or a quoted attribute", () => {
    expect(escapeHtml(`<script>alert('hi') & "quotes"</script>`)).toBe(
      "&lt;script&gt;alert(&#39;hi&#39;) &amp; &quot;quotes&quot;&lt;/script&gt;",
    );
  });

  it("leaves ordinary Danish text untouched", () => {
    expect(escapeHtml("Stå med hænderne mod en væg")).toBe("Stå med hænderne mod en væg");
  });

  it("leaves nothing to assemble a tag from once escaped", () => {
    const hostile = `"><img src=x onerror=alert(1)>`;
    const escaped = escapeHtml(hostile);
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
    expect(escaped).not.toContain('"');
  });
});
