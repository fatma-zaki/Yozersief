import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { Stepper } from "@/components/ui/Stepper";
import { ar } from "@/i18n/ar";
import { ReadinessPanel } from "@/modules/orders";

export const metadata = { title: ar.order.title };

const STEPS = ar.order.steps.map((label, i) => ({ key: String(i), label }));

/** Request builder skeleton (Phase 1 fills the steps, B5). */
export default function OrderPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Stepper steps={STEPS} current={0} label={ar.order.title} />
      </Card>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <EmptyState icon={<ClipboardList />} title={ar.order.comingSoon} />
        <ReadinessPanel
          items={[
            { key: "type", label: ar.order.steps[0], state: "attention" },
            { key: "details", label: ar.order.steps[1], state: "attention" },
            { key: "files", label: ar.order.steps[2], state: "optional" },
            { key: "contact", label: ar.order.steps[3], state: "attention" },
          ]}
        />
      </div>
    </div>
  );
}
