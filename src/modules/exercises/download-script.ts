/**
 * The downloaded programme's only script (docs/plan-ovelser-og-programmer.md):
 * a "Færdig" button remembers its state in `localStorage`, keyed by the
 * programme it was downloaded as (`programKey`, the route's own `program`
 * or `c` value — already a safe, narrow charset by the time it reaches
 * here). `programKey` still goes through `JSON.stringify` and the same
 * "</" guard a script tag always needs, so embedding it can never break
 * out of the `<script>` element.
 *
 * Pure: a string in, a string out, nothing executed here.
 */

function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

export function downloadScript(programKey: string): string {
  const key = jsonForScript(`kadence:programme:${programKey}`);
  return (
    "(function(){" +
    `var KEY=${key};` +
    'var done;try{done=new Set(JSON.parse(localStorage.getItem(KEY)||"[]"))}catch(e){done=new Set()}' +
    "function save(){try{localStorage.setItem(KEY,JSON.stringify(Array.from(done)))}catch(e){}}" +
    'document.querySelectorAll("[data-card-id]").forEach(function(btn){' +
    'var id=btn.getAttribute("data-card-id");' +
    'if(done.has(id)){btn.setAttribute("aria-pressed","true")}' +
    'btn.addEventListener("click",function(){' +
    'var on=btn.getAttribute("aria-pressed")==="true";' +
    'btn.setAttribute("aria-pressed",String(!on));' +
    "if(on){done.delete(id)}else{done.add(id)}" +
    "save()" +
    "})" +
    "})" +
    "})();"
  );
}
