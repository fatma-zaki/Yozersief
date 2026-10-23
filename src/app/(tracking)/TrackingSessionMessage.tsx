import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ar } from "@/i18n/ar";

export function TrackingSessionMessage({ title, body }: { title: string; body: string }) {
  return (
    <Card className="flex flex-col items-center gap-4 py-10 text-center">
      <CardTitle>{title}</CardTitle>
      <p className="text-ink-muted max-w-sm text-sm leading-7">{body}</p>
      <Button asChild>
        <Link href="/track">{ar.tracking.submit}</Link>
      </Button>
    </Card>
  );
}
