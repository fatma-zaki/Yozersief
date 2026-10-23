import { cacheLife, cacheTag } from "next/cache";
import { findSettingValue } from "../infrastructure/settings-repository";

/**
 * Typed access to the `settings` table. Values flagged `pending: true` are open business
 * decisions (brief B13) and must be shown as [للتأكيد] in the UI.
 */
export type SettingValues = {
  "security.two_factor": { enforced: boolean };
  "security.new_device_alert": { enabled: boolean };
  "security.timeout": { minutes: number | null; pending?: boolean };
  "invitations.expiry_hours": { hours: number; pending?: boolean };
  "files.max_mb": { mb: number; pending?: boolean };
};

export type SettingKey = keyof SettingValues;

const DEFAULTS: SettingValues = {
  "security.two_factor": { enforced: false },
  "security.new_device_alert": { enabled: true },
  "security.timeout": { minutes: null, pending: true },
  "invitations.expiry_hours": { hours: 72, pending: true },
  "files.max_mb": { mb: 20, pending: true },
};

export const SETTINGS_CACHE_TAG = "settings";

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValues[K]> {
  "use cache";
  cacheTag(SETTINGS_CACHE_TAG, `settings:${key}`);
  cacheLife("minutes");

  const value = (await findSettingValue(key)) as SettingValues[K] | undefined;
  return value ?? DEFAULTS[key];
}
