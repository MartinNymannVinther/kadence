/**
 * Full frame, no margins: for a page that lays out its own panes and
 * fills what the sidebar leaves. No page of Kadence's uses it yet; the
 * group came with the foundation (ADR 0001), and the ordinary page width
 * lives in the (narrow) group beside it. Both sit inside the app layout's
 * sidebar shell.
 */
export default function WideLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </main>
  );
}
