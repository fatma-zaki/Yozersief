import s from "@/components/admin/admin.module.css";
import shell from "@/components/admin/shell/shell.module.css";
import { cn } from "@/lib/cn";

/**
 * Shown the moment a sidebar tab is clicked, while the section's data loads: the header, a row
 * of stat cards and a panel, in the screens' glass style. Without it the click looks dead until
 * the server answers.
 */
export default function DashboardLoading() {
  return (
    <div className={shell.skel} role="status" aria-label="جارٍ التحميل">
      <div className={cn(s.glass, shell.bone)} style={{ height: 88 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(s.glass, shell.bone)}
            style={{ height: 112, animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <div className={cn(s.glass, shell.bone)} style={{ height: 360, animationDelay: "0.2s" }} />
    </div>
  );
}
