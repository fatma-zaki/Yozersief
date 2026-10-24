import { ar } from "@/i18n/ar";

const actionLabels = ar.team.actions as Readonly<Record<string, string>>;

/** Arabic label for a known action; safe generic fallback for anything else. */
export function labelForAction(action: string): string {
  return actionLabels[action] ?? ar.team.unknownAction;
}
