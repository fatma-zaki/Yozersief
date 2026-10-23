/**
 * WhatsApp template rendering (brief A6.6, B8). Pure.
 * Unknown or missing variables are left visible (e.g. "{price}") so a gap is noticed in the
 * preview instead of silently sending a broken sentence.
 */
export const TEMPLATE_VARIABLES = [
  "name",
  "ref",
  "link",
  "price",
  "date",
  "org",
  "reason",
  "update",
  "quote",
  "price_date",
] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];
export type TemplateVars = Partial<Record<TemplateVariable, string>>;

export function renderTemplate(body: string, vars: TemplateVars): string {
  return body
    .replace(/\{(\w+)\}/g, (match, key: string) => {
      const value = (vars as Record<string, string | undefined>)[key];
      return value === undefined ? match : value;
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/** Variables used in a template that have no value yet. */
export function missingVariables(body: string, vars: TemplateVars): string[] {
  const used = [...body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
  return [...new Set(used)].filter((k) => !(k in vars));
}

/** wa.me deep link with a prefilled message. `phone` is the international form, e.g. 2010…. */
export function whatsappLink(internationalPhone: string, body: string): string {
  return `https://wa.me/${internationalPhone}?text=${encodeURIComponent(body)}`;
}

/** Outbox retry backoff: 1m, 5m, 15m, 1h, then give up. */
export const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 15, 60];

export function nextAttemptAt(attempts: number, now: Date): Date | null {
  if (attempts >= MAX_ATTEMPTS) return null;
  const minutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)] ?? 1;
  return new Date(now.getTime() + minutes * 60_000);
}
