import { CircleAlert, CircleCheck, CircleDashed } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { ar } from "@/i18n/ar";
import { cn } from "@/lib/cn";

export type ReadinessItem = {
  key: string;
  label: string;
  state: "ok" | "attention" | "optional";
  /** id of the field the "fix it" action jumps to. */
  fieldId?: string;
};

const ICONS = { ok: CircleCheck, attention: CircleAlert, optional: CircleDashed };

/** Live checklist of required items (brief B5). Submission stays blocked until all are ok. */
export function ReadinessPanel({ items }: { items: readonly ReadinessItem[] }) {
  return (
    <Card className="flex flex-col gap-4" aria-live="polite">
      <div>
        <CardTitle>{ar.order.readiness}</CardTitle>
        <CardDescription>{ar.order.readinessHint}</CardDescription>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = ICONS[item.state];
          return (
            <li key={item.key} className="flex items-center gap-3 text-sm">
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-5 shrink-0",
                  item.state === "ok" && "text-teal-2 dark:text-mint",
                  item.state === "attention" && "text-gold",
                  item.state === "optional" && "text-ink-soft",
                )}
              />
              <span className="flex-1">{item.label}</span>
              {item.state === "attention" && item.fieldId ? (
                <a href={`#${item.fieldId}`} className="text-accent font-bold underline">
                  ظبّطها
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
