/*
 * Kadence's service worker: reminders, and nothing else (docs/adr/0059).
 *
 * A push from Kadence carries no content. It only wakes this worker, which
 * asks Kadence what is new with the person's own cookies and shows the
 * answer, so the browser's push service never sees a word of it. There is
 * no fetch handler and no cache: pages load exactly as they do without
 * this file, and nothing is kept offline.
 *
 * A push must always end in a notification — Safari takes the permission
 * away from a site whose pushes show nothing — so when Kadence cannot be
 * asked, or has nothing to say, the plain words below are shown. They are
 * the one text outside messages/*.json, because a worker cannot read
 * them; tests/push/texts.test.ts keeps them equal to
 * `reminders.notify.fallbackTitle` and `fallbackBody`.
 */

const FALLBACK = {
  da: { title: "Der er nyt i Kadence", body: "Åbn Kadence for at se det." },
  en: { title: "There is something new in Kadence", body: "Open Kadence to see it." },
};

function fallback() {
  const english = (self.navigator.language || "").toLowerCase().startsWith("en");
  const words = english ? FALLBACK.en : FALLBACK.da;
  return { title: words.title, body: words.body, url: english ? "/en/today" : "/today" };
}

/** Only a path in Kadence itself may be opened from a notification, with its #anchor. */
function samePath(url) {
  try {
    const target = new URL(url, self.location.origin);
    return target.origin === self.location.origin
      ? target.pathname + target.search + target.hash
      : "/today";
  } catch {
    return "/today";
  }
}

async function latest() {
  try {
    const response = await fetch("/api/push/latest", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) return fallback();
    const note = await response.json();
    if (!note || typeof note.title !== "string" || !note.title) return fallback();
    return {
      title: note.title,
      body: typeof note.body === "string" ? note.body : "",
      url: typeof note.url === "string" ? note.url : "/today",
    };
  } catch {
    return fallback();
  }
}

self.addEventListener("install", () => {
  // A new version of this file takes over at once; it holds no state.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    latest().then((note) =>
      self.registration.showNotification(note.title, {
        body: note.body,
        icon: "/icon-192.png",
        // One at a time: a newer reminder replaces the one still showing.
        tag: "kadence",
        renotify: true,
        data: { url: samePath(note.url) },
      }),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = samePath((event.notification.data && event.notification.data.url) || "/today");
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          await client.focus();
          if ("navigate" in client) await client.navigate(path);
          return;
        } catch {
          // A window this worker does not control cannot be sent anywhere; open one.
        }
      }
      await self.clients.openWindow(path);
    })(),
  );
});
