import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import type { Translate } from "@/modules/exercises/dose";
import { renderProgramHtml } from "@/modules/exercises/download-html";
import type { ProgramView } from "@/modules/exercises/types";
import da from "../../messages/da.json";

const t: Translate = createTranslator({
  locale: "da",
  messages: da,
  namespace: "exercises",
}) as unknown as Translate;

const NOW = new Date("2026-10-06T10:00:00Z");

const plank: ProgramView["parts"][number]["items"][number] = {
  exercise: {
    ref: "builtin:plank",
    name: "Planke",
    how: "Hold kroppen lige som en planke.",
    why: "En stærk midte bærer benene.",
    group: "core",
    equipment: ["mat"],
    dose: { kind: "time", seconds: 30, perSide: false, sets: 3 },
    pose: {
      joints: {
        head: [50, 80],
        neck: [70, 90],
        hip: [110, 95],
        elbowA: [70, 115],
        handA: [45, 115],
        elbowB: [70, 115],
        handB: [45, 115],
        kneeA: [150, 100],
        footA: [190, 100],
        kneeB: [150, 100],
        footB: [190, 100],
      },
      hidden: [],
      props: [{ kind: "floor", y: 122 }],
      arrows: [],
    },
  },
  dose: { kind: "time", seconds: 30, perSide: false, sets: 3 },
};

const hostile: ProgramView["parts"][number]["items"][number] = {
  ...plank,
  exercise: {
    ...plank.exercise,
    ref: "builtin:hostile",
    name: `<script>alert('x')</script>`,
    how: `"onmouseover="alert(1)`,
    why: `</style><img src=x>`,
  },
};

const program: ProgramView = {
  title: "Mobilitet",
  description: "Korte stræk til dagen",
  parts: [
    { key: "morning", items: [plank] },
    { key: "evening", items: [hostile] },
  ],
};

function render(view: ProgramView = program) {
  return renderProgramHtml(view, { t, locale: "da", programKey: "builtin:mobilityDay", now: NOW });
}

describe("the downloaded programme", () => {
  it("has no script src and no external reference", () => {
    const html = render();
    expect(html).not.toMatch(/<script[^>]*\ssrc=/i);
    expect(html).not.toContain("<link");
    expect(html).not.toMatch(/\burl\(\s*["']?https?:/i);
    expect(html).not.toMatch(/\bsrc=["']https?:/i);
    expect(html).not.toMatch(/\bhref=["']https?:/i);
  });

  it("escapes a hostile exercise name, how and why", () => {
    const html = render();
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain('onmouseover="alert');
    expect(html).toContain("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(html).toContain("&quot;onmouseover=&quot;alert(1)");
    expect(html).toContain("&lt;/style&gt;&lt;img src=x&gt;");
  });

  it("carries both light and dark values for every figure and page token", () => {
    const html = render();
    expect(html).toContain(":root{color-scheme:light dark;");
    expect(html).toContain("@media (prefers-color-scheme:dark){:root{");
    // The light and dark ink are different values, and both are present.
    expect(html).toContain("--foreground:oklch(0.245 0.008 75)");
    expect(html).toContain("--foreground:oklch(0.94 0.006 85)");
  });

  it("contains every card, numbered within its part", () => {
    const html = render();
    expect(html).toContain("Planke");
    expect(html.match(/class="card"/g)).toHaveLength(2);
    expect(html).toContain('<span class="num">1.</span>');
  });

  it("names the programme's title and description", () => {
    const html = render();
    expect(html).toContain("<title>Mobilitet</title>");
    expect(html).toContain("Korte stræk til dagen");
  });

  it("shows tabs only when there is more than one part", () => {
    const html = render();
    expect(html).toContain('id="part-0"');
    expect(html).toContain('id="panel-1"');

    const onePart: ProgramView = { ...program, parts: [program.parts[0]!] };
    const soloHtml = render(onePart);
    expect(soloHtml).not.toContain('type="radio"');
    expect(soloHtml).toContain('class="part"');
  });

  it("names every part for paper, where the tabs are not shown", () => {
    const html = render();
    expect(html).toContain('<h2 class="part-title">Morgen</h2>');
    expect(html).toContain("@media print{");
    expect(html).toContain(
      ".card{display:block;margin-bottom:.75rem;break-inside:avoid;page-break-inside:avoid}",
    );
    expect(html).toContain(".tab-input,.tab,.done-btn{display:none}");
  });

  it("keys the 'Færdig' script to the programme it was downloaded as", () => {
    const html = render();
    expect(html).toContain("kadence:programme:builtin:mobilityDay");
    expect(html).toContain('aria-pressed="false"');
  });

  it("writes the footer with the given date, in Danish", () => {
    expect(render()).toContain("Kadence · 6. oktober 2026");
  });
});
