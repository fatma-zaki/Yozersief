"use client";

import { useEffect } from "react";
import { logoutTrackingAction } from "./actions";

/**
 * Clears the tracking cookie via a Server Action.
 * Required because RSC render cannot call `cookies().set` (Next.js constraint).
 */
export function ClearTrackingSessionOnMount() {
  useEffect(() => {
    void logoutTrackingAction();
  }, []);
  return null;
}
