"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Routes that are never site traffic; the server filters them again. */
const SKIP = /^\/(dashboard|login|api)(\/|$)/;

/** Last path sent; React StrictMode runs effects twice in development. */
let lastSent = "";

/**
 * Sends one beacon per page shown (first-party analytics, ADR-0008). No cookies, no storage.
 * Honours Do Not Track / Global Privacy Control.
 */
export function PageViews() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname === lastSent) return;
    lastSent = pathname;
    if (SKIP.test(pathname)) return;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      utm: new URLSearchParams(location.search).get("utm_source"),
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/analytics/collect", blob)) {
      void fetch("/api/analytics/collect", { method: "POST", body, keepalive: true }).catch(
        () => {},
      );
    }
  }, [pathname]);
  return null;
}
