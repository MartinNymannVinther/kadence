"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DemoWaiting } from "./demo-waiting";

/**
 * A link that opens a new demo, and says so while the demo is built. It
 * stays a plain anchor to the GET route, so open-in-new-tab and the
 * address in the status bar work as before; a plain click also lays the
 * waiting screen over the page until the browser leaves it. A second
 * click while waiting is swallowed: each would build another workspace,
 * and the route's rate limit counts them.
 */
export function DemoLink({
  href,
  variant,
  className,
  children,
}: {
  href: string;
  variant: "team" | "alone";
  className?: string;
  children: React.ReactNode;
}) {
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!waiting) return;
    // Back from the demo, the browser may show this page from its cache
    // exactly as it was left, waiting screen and all.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setWaiting(false);
    };
    // Escape stops the page loading, and the screen goes with it.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      window.stop();
      setWaiting(false);
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [waiting]);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (waiting) {
      event.preventDefault();
      return;
    }
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setWaiting(true);
  }

  return (
    <>
      <a href={href} className={className} onClick={handleClick}>
        {children}
      </a>
      {waiting && createPortal(<DemoWaiting variant={variant} />, document.body)}
    </>
  );
}
