import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { ar } from "@/i18n/ar";

export const metadata = { title: ar.tracking.title };

/** Manual entry: ref + phone → OTP on WhatsApp (B6). Phase 2 wires the OTP flow. */
export default function TrackPage() {
  return (
    <Card className="flex flex-col gap-5">
      <div>
        <CardTitle>{ar.tracking.title}</CardTitle>
        <CardDescription>{ar.tracking.subtitle}</CardDescription>
      </div>
      <form className="flex flex-col gap-4" aria-describedby="track-soon">
        <Field id="ref" label={ar.tracking.refLabel}>
          <Input
            id="ref"
            name="ref"
            dir="ltr"
            placeholder="YZ-XXXXXX"
            autoComplete="off"
            disabled
          />
        </Field>
        <Field id="phone" label={ar.tracking.phoneLabel}>
          <Input
            id="phone"
            name="phone"
            dir="ltr"
            inputMode="tel"
            placeholder="01xxxxxxxxx"
            disabled
          />
        </Field>
        <Button type="submit" disabled>
          {ar.tracking.send}
        </Button>
        <p id="track-soon" className="text-ink-muted text-center text-sm">
          {ar.tracking.comingSoon}
        </p>
      </form>
    </Card>
  );
}
