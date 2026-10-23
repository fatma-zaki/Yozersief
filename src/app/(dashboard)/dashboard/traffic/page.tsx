import { SectionPage } from "@/components/layout/dashboard/SectionPage";
import { Card } from "@/components/ui/Card";
import { formatNumber } from "@/lib/format";
import { createAnalyticsReader } from "@/modules/content";

/** Traffic (B12). Shows a "demo data" notice until an analytics provider is connected. */
export default function TrafficPage() {
  return (
    <SectionPage href="/dashboard/traffic">
      <TrafficSummary />
    </SectionPage>
  );
}

async function TrafficSummary() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const summary = await createAnalyticsReader().summary({ from, to });
  const stats = [
    { label: "الزوار", value: summary.visitors },
    { label: "الجلسات", value: summary.sessions },
    { label: "متواجدين دلوقتي", value: summary.liveVisitors },
  ];
  return (
    <div className="flex flex-col gap-4">
      {summary.isDemo ? (
        <p
          role="note"
          className="rounded-input bg-warn-bg text-warn-ink px-4 py-3 text-sm font-bold"
        >
          بيانات تجريبية — هتتغير لما نربط أداة الإحصائيات [للتأكيد: Plausible أو GA4].
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-ink-muted text-sm">{s.label}</p>
            <p className="text-3xl font-extrabold">{formatNumber(s.value)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
