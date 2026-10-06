import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/core/auth/session";
import { remindersOn } from "@/core/features";
import { latestFor, type Note } from "@/modules/push/latest";
import { renderNote, type NoteLocale } from "@/modules/push/texts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * What a reminder says (docs/adr/0059). The push that woke the service
 * worker carried nothing; the worker asks here with the person's own
 * cookies, and the answer is computed as that person, in their language.
 * Signed out, the answer is 401 and the worker shows a plain "there is
 * something new"; with nothing to say, the plain words come from here.
 */
export async function GET() {
  if (!remindersOn()) return new Response("Not found", { status: 404 });
  const session = await getSession();
  if (!session) return new Response(null, { status: 401, headers: NO_STORE });

  const locale: NoteLocale = (await cookies()).get("NEXT_LOCALE")?.value === "en" ? "en" : "da";
  let note: Note | null = null;
  try {
    note = await latestFor(session.user.id);
  } catch (error) {
    console.error("reminders: latest failed", error instanceof Error ? error.message : "");
  }
  const t = await getTranslations({ locale, namespace: "reminders.notify" });
  return Response.json(
    renderNote(note, (key, values) => t(key, values), locale),
    { headers: NO_STORE },
  );
}
