import { FitError } from "@/modules/fit";

/**
 * Just enough XML to read TCX and GPX: elements, attributes, text and
 * CDATA, with namespace prefixes dropped (`ns3:hr` is `hr`). Kadence's
 * own, like the FIT decoder (CLAUDE.md: no dependency), and built for
 * hostile input:
 *
 * - A document type declaration is refused outright. Without a DTD there
 *   are no custom entities, so neither "billion laughs" nor an external
 *   entity (XXE) can be expressed; only the five predefined entities and
 *   character references are decoded.
 * - Elements are capped (`MAX_EVENTS`) and so is nesting (`MAX_DEPTH`).
 * - A tag, comment or section that never closes is `truncated`, not
 *   guessed at.
 *
 * It does not check that the document is well-formed beyond that: the
 * readers take what they know and ignore the rest.
 */

export const MAX_EVENTS = 5_000_000;
export const MAX_DEPTH = 64;

export type XmlHandler = {
  open(name: string, attrs: Record<string, string>): void;
  close(name: string): void;
  text(text: string): void;
};

const local = (name: string) => name.slice(name.indexOf(":") + 1);

const PREDEFINED: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

export function decodeEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(/&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|[a-z]{2,4});/g, (whole, ref: string) => {
    if (ref.startsWith("#")) {
      const code = ref[1] === "x" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return PREDEFINED[ref] ?? whole;
  });
}

function attributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of source.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))
    attrs[local(match[1]!)] = decodeEntities(match[2] ?? match[3] ?? "");
  return attrs;
}

export function scanXml(xml: string, handler: XmlHandler): void {
  const truncated = () => new FitError("truncated", "The XML ends inside a tag.");
  const until = (marker: string, from: number) => {
    const at = xml.indexOf(marker, from);
    if (at < 0) throw truncated();
    return at;
  };
  let depth = 0;
  let events = 0;
  let pos = 0;
  while (pos < xml.length) {
    const lt = xml.indexOf("<", pos);
    const textEnd = lt < 0 ? xml.length : lt;
    if (textEnd > pos) {
      const text = xml.slice(pos, textEnd);
      if (text.trim()) handler.text(decodeEntities(text.trim()));
    }
    if (lt < 0) break;
    if (++events > MAX_EVENTS) throw new FitError("too_large", "Too many XML elements.");

    if (xml.startsWith("<?", lt)) {
      pos = until("?>", lt + 2) + 2;
    } else if (xml.startsWith("<!--", lt)) {
      pos = until("-->", lt + 4) + 3;
    } else if (xml.startsWith("<![CDATA[", lt)) {
      const end = until("]]>", lt + 9);
      const text = xml.slice(lt + 9, end).trim();
      if (text) handler.text(text);
      pos = end + 3;
    } else if (xml.startsWith("<!", lt)) {
      throw new FitError("unsupported", "A document type declaration is not read.");
    } else if (xml.startsWith("</", lt)) {
      const end = until(">", lt + 2);
      handler.close(local(xml.slice(lt + 2, end).trim()));
      depth = Math.max(0, depth - 1);
      pos = end + 1;
    } else {
      // The tag's end: the first ">" outside a quoted attribute value.
      let end = lt + 1;
      let quote: string | null = null;
      for (; end < xml.length; end++) {
        const c = xml[end]!;
        if (quote) {
          if (c === quote) quote = null;
        } else if (c === '"' || c === "'") quote = c;
        else if (c === ">") break;
      }
      if (end >= xml.length) throw truncated();
      const inner = xml.slice(lt + 1, end);
      const selfClosing = inner.endsWith("/");
      const body = selfClosing ? inner.slice(0, -1) : inner;
      const name = /^[^\s/>]+/.exec(body)?.[0];
      if (!name) throw new FitError("corrupt", "A tag without a name.");
      handler.open(local(name), attributes(body.slice(name.length)));
      if (selfClosing) handler.close(local(name));
      else if (++depth > MAX_DEPTH) throw new FitError("corrupt", "XML nested too deep.");
      pos = end + 1;
    }
  }
}
