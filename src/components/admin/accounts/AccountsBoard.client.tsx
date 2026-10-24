"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { inviteStaffAction, signOutOtherDevicesAction } from "@/app/(dashboard)/dashboard/actions";
import {
  setMemberRoleAction,
  setMemberStatusAction,
  setRolePermissionAction,
} from "@/app/(dashboard)/dashboard/accounts/actions";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { normalizeEgyptianMobile, toInternational } from "@/lib/phone";
import type { Permission, RoleKey } from "@/lib/rbac/permissions";
import s from "../admin.module.css";
import { Ic, P } from "../Ic";
import { KitHeader, KitToast, Switch, useFlash } from "../Kit.client";
import k from "../kit.module.css";
import shell from "../shell/shell.module.css";
import a from "./accounts.module.css";

/**
 * Accounts & permissions, from docs/design/Admin-Accounts.html. Live: members, roles,
 * invitations, pause/activate, the permission matrix, signed-in devices. Demo (client state, as
 * in the design): security switches and the admin log.
 */

export type AccountMember = {
  id: string;
  name: string;
  contact: string;
  roleKey: RoleKey;
  status: "active" | "pending" | "paused";
  last: string;
  you: boolean;
};

export type AccountSession = { id: string; name: string; when: string; current: boolean };

const ROLE: Record<RoleKey, string> = {
  admin: "مدير",
  desk: "استقبال طلبات",
  design: "مصمم",
  prod: "إنتاج",
  delivery: "تسليم وتحصيل",
};
const ROLE_OPTIONS: RoleKey[] = ["desk", "design", "prod", "delivery", "admin"];
type TeamRole = Exclude<RoleKey, "admin">;

/**
 * The design's matrix rows: [permission, label, group heading]. «تأكيد الدفعات», «تعديل بيانات
 * الطلب» and «نشاط الفريق» are not in the design but are real permissions, so they get rows too.
 */
const PERMS: [Permission, string, string?][] = [
  ["orders.view", "مشاهدة الطلبات", "الطلبات"],
  ["customers.view_phone", "رؤية رقم هاتف العميل"],
  ["orders.request_info", "طلب بيانات من العميل"],
  ["quotes.draft", "تجهيز مسودة عرض السعر"],
  ["orders.approve", "الموافقة النهائية والأسعار"],
  ["orders.edit", "تعديل بيانات الطلب"],
  ["messages.send", "إرسال رسائل واتساب للعملاء"],
  ["mockups.manage", "رفع الموكاب وتعديله", "التنفيذ"],
  ["production.update", "تحديث الإنتاج وفحص الجودة"],
  ["payments.record", "تسجيل العربون والتحصيل"],
  ["payments.confirm", "تأكيد استلام الدفعات"],
  ["delivery.handover", "تأكيد تسليم الطلبات"],
  ["catalog.manage", "تعديل المنتجات والخدمات", "الموقع والإدارة"],
  ["gallery.manage", "نشر صور الأعمال"],
  ["content.manage", "تعديل نصوص الموقع"],
  ["traffic.view", "مشاهدة الزيارات وحركة الزوار"],
  ["team.activity.view", "مشاهدة نشاط الفريق"],
  ["accounts.manage", "إدارة الحسابات والصلاحيات"],
];

export type AccountMatrix = Record<TeamRole, Permission[]>;

const ROLE_VIEWS: [TeamRole, `/dashboard/${string}`, string][] = [
  ["desk", "/dashboard/desk", P.inbox],
  [
    "design",
    "/dashboard/design",
    "M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 11m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
  ],
  [
    "prod",
    "/dashboard/production",
    "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  ],
  ["delivery", "/dashboard/delivery", P.truck],
];

const SECURITY: ["twofa" | "alert" | "timeout", string, string, string][] = [
  ["twofa", "التحقق بخطوتين", "رمز على الهاتف مع كل تسجيل دخول جديد", P.shieldCheck],
  [
    "alert",
    "تنبيه دخول من جهاز جديد",
    "رسالة لصاحب المتجر إذا سجّل أحد الدخول من جهاز غير معروف",
    P.bell,
  ],
  ["timeout", "خروج تلقائي بعد عدم استخدام", "بعد 30 دقيقة [المدة للتأكيد]", P.clock],
];

const LAPTOP = "M4 4h16a1 1 0 0 1 1 1v10H3V5a1 1 0 0 1 1-1zM2 19h20";
const MOBILE = "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01";
const ADD_USER =
  "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 1 1 8 0M19 8v6M22 11h-6";

const DEMO_LOG = [
  { t: "22 أكتوبر 10:20 ص", m: "وافق صاحب المتجر على الطلب YZ-H3J8LC وأُرسلت رسالة واتساب." },
  { t: "21 أكتوبر 6:40 م", m: "طلب [اسم الموظف] بيانات من عميل على الطلب YZ-B6R2NX." },
  { t: "20 أكتوبر 1:05 م", m: "أرسل صاحب المتجر دعوة إلى [اسم المصمم]." },
  { t: "19 أكتوبر 11:00 ص", m: "أخفى صاحب المتجر منتج «هدايا ولافتات مخصصة»." },
];

export function AccountsBoard({
  members: initialMembers,
  sessions,
  matrix,
  canEditMatrix,
}: {
  members: AccountMember[];
  sessions: AccountSession[];
  matrix: AccountMatrix;
  /** Only the admin edits the matrix (the server enforces it too). */
  canEditMatrix: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [, startEdit] = useTransition();
  // Role and matrix edits show at once and fall back to the server's answer when it lands.
  const [roleOverride, setRoleOverride] = useOptimistic(
    {} as Record<string, RoleKey>,
    (o, [id, role]: [string, RoleKey]) => ({ ...o, [id]: role }),
  );
  const [perms, setPerm] = useOptimistic(
    matrix,
    (m, [role, key, on]: [TeamRole, Permission, boolean]) => ({
      ...m,
      [role]: on ? [...m[role], key] : m[role].filter((p) => p !== key),
    }),
  );
  const [sec, setSec] = useState({ twofa: true, alert: true, timeout: false });
  const [log, setLog] = useState(DEMO_LOG);
  const [invite, setInvite] = useState(false);
  const { toast, flash, hide } = useFlash();

  const members = initialMembers.map((m) => ({ ...m, roleKey: roleOverride[m.id] ?? m.roleKey }));

  const changeRole = (m: AccountMember, role: RoleKey) =>
    startEdit(async () => {
      setRoleOverride([m.id, role]);
      const result = await setMemberRoleAction({ userId: m.id, roleKey: role });
      if (!result.ok) return flash(result.error);
      flash(`تغيّر دور ${m.name} إلى ${ROLE[role]}`);
      router.refresh();
    });

  const togglePerm = (role: TeamRole, key: Permission, label: string, on: boolean) =>
    startEdit(async () => {
      setPerm([role, key, on]);
      const result = await setRolePermissionAction({ roleKey: role, permission: key, granted: on });
      if (!result.ok) return flash(result.error);
      flash(`${on ? "أُضيفت" : "أُزيلت"} صلاحية «${label}» لدور ${ROLE[role]}`);
      router.refresh();
    });

  const toggleStatus = (m: AccountMember) => {
    const status = m.status === "paused" ? "active" : "paused";
    startTransition(async () => {
      const result = await setMemberStatusAction({ userId: m.id, status });
      if (!result.ok) return flash(result.error);
      flash(status === "paused" ? `أُوقف حساب ${m.name}` : `فُعّل حساب ${m.name}`);
      router.refresh();
    });
  };

  return (
    <div className={cn(k.root, shell.gutter)}>
      <KitHeader
        title="الحسابات والصلاحيات"
        subtitle="من يستطيع دخول لوحة الإدارة، وما الذي يستطيع كل عضو فعله"
      >
        <button
          className={cn(k.btn, k.cta)}
          type="button"
          onClick={() => setInvite(true)}
          style={{ minHeight: 46, padding: "8px 22px", borderRadius: 999, fontSize: 15 }}
        >
          <Ic d={ADD_USER} size={18} stroke={2.2} />
          دعوة عضو
        </button>
      </KitHeader>

      <section
        className={cn(k.card, s.up, s.d1)}
        aria-labelledby="mem-h"
        style={{ padding: "18px 20px" }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 id="mem-h" className={k.h2}>
            الأعضاء
          </h2>
          <span className={k.muted} style={{ fontSize: 12 }}>
            {members.length} أعضاء
          </span>
        </div>
        <div className={k.scrollM}>
          <div
            role="table"
            aria-label="الأعضاء"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 10,
              minWidth: 640,
            }}
          >
            <div
              role="row"
              className={a.mrow}
              style={{
                paddingTop: 0,
                paddingBottom: 0,
                background: "transparent",
                boxShadow: "none",
              }}
            >
              <span role="columnheader" className={a.mh}>
                العضو
              </span>
              <span role="columnheader" className={a.mh}>
                الدور
              </span>
              <span role="columnheader" className={a.mh}>
                الحالة
              </span>
              <span role="columnheader" className={a.mh}>
                آخر نشاط
              </span>
              <span role="columnheader" className={a.mh}>
                <span className={s.srOnly}>إجراءات</span>
              </span>
            </div>
            {members.map((m) => (
              <div key={m.id} role="row" className={cn(a.mrow, s.fade)}>
                <span role="cell" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      ...(m.you
                        ? {
                            background: "linear-gradient(180deg,#b8f2de,#7ee8c7)",
                            color: "#01302d",
                            boxShadow: "0 0 10px rgba(126,232,199,0.5)",
                          }
                        : {
                            background: "var(--tile-bg)",
                            color: "var(--tile-ink)",
                            boxShadow: "0 0 0 1px var(--tint-bd)",
                          }),
                    }}
                  >
                    {m.name.replace(/[[\]]/g, "").charAt(0)}
                  </span>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <strong className={k.strong}>
                      {m.name}
                      {m.you ? " (أنت)" : ""}
                    </strong>
                    <span
                      dir="ltr"
                      className={k.muted}
                      style={{ fontSize: 12, textAlign: "right" }}
                    >
                      {m.contact}
                    </span>
                  </span>
                </span>
                <span role="cell">
                  {m.you ? (
                    <span className={cn(k.badge, k.bRole)}>{ROLE[m.roleKey]}</span>
                  ) : (
                    <select
                      className={k.fld}
                      value={m.roleKey}
                      aria-label={`دور ${m.name}`}
                      onChange={(e) => changeRole(m, e.target.value as RoleKey)}
                      style={{ width: "auto", minHeight: 38, padding: "4px 10px", fontSize: 13 }}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {ROLE[r]}
                        </option>
                      ))}
                    </select>
                  )}
                </span>
                <span role="cell">
                  <span
                    className={cn(
                      k.badge,
                      m.status === "active" ? k.bOk : m.status === "pending" ? k.bWarn : k.bOff,
                    )}
                  >
                    {m.status === "active"
                      ? "نشط"
                      : m.status === "pending"
                        ? "دعوة معلّقة"
                        : "موقوف"}
                  </span>
                </span>
                <span role="cell" className={k.muted} style={{ fontSize: 13 }}>
                  {m.last}
                </span>
                <span role="cell">
                  {m.you ? null : (
                    <button
                      className={cn(k.btn, k.line)}
                      type="button"
                      disabled={pending || m.status === "pending"}
                      onClick={() => toggleStatus(m)}
                      style={{
                        minHeight: 36,
                        padding: "2px 14px",
                        borderRadius: 999,
                        fontSize: 12,
                      }}
                    >
                      {m.status === "paused" ? "تفعيل" : "إيقاف"}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={cn(k.card, s.up, s.d1)}
        aria-labelledby="va-h"
        style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <h2 id="va-h" className={k.h2}>
            شاهد اللوحة كما يراها كل دور
          </h2>
          <span className={k.muted} style={{ fontSize: 12 }}>
            يرى كل عضو الأقسام والأزرار التي يسمح بها دوره فقط
          </span>
        </div>
        <div
          className={k.twoM}
          style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}
        >
          {ROLE_VIEWS.map(([role, href, icon]) => {
            const n = perms[role].length;
            const people = members.filter((m) => m.roleKey === role).length;
            return (
              <Link
                key={role}
                className={cn(k.lift, k.tint, a.view)}
                href={href}
                style={{
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  textDecoration: "none",
                }}
              >
                <span
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <span className={k.tile} aria-hidden="true" style={{ width: 40, height: 40 }}>
                    <Ic d={icon} size={20} />
                  </span>
                  <Ic
                    d="M12 19l-7-7 7-7M19 12H5"
                    size={18}
                    style={{ color: "var(--accent-ink)" }}
                  />
                </span>
                <strong className={k.strong} style={{ fontSize: 15 }}>
                  {ROLE[role]}
                </strong>
                <span className={k.muted} style={{ fontSize: 12 }}>
                  {n} صلاحيات · {people} عضو
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div
        className={k.stackM}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section
          className={cn(k.card, s.up, s.d2)}
          aria-labelledby="rl-h"
          style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h2 id="rl-h" className={k.h2}>
              الأدوار والصلاحيات
            </h2>
            <span className={k.muted} style={{ fontSize: 12 }}>
              يملك المدير جميع الصلاحيات دائمًا
            </span>
          </div>
          <div className={k.scrollM}>
            <div role="table" aria-label="الأدوار والصلاحيات" style={{ minWidth: 520 }}>
              <div
                role="row"
                className={cn(a.xrow, k.strong)}
                style={{ fontSize: 13, fontWeight: 800 }}
              >
                <span role="columnheader">الصلاحية</span>
                {["مدير", "استقبال", "مصمم", "إنتاج", "تسليم"].map((r) => (
                  <span key={r} role="columnheader" style={{ textAlign: "center" }}>
                    {r}
                  </span>
                ))}
              </div>
              {PERMS.map(([key, label, group]) => (
                <Fragment key={key}>
                  {group ? (
                    <div role="row" className={a.xrow} style={{ borderBottom: 0, paddingTop: 14 }}>
                      <span
                        role="rowheader"
                        style={{ fontSize: 12, fontWeight: 800, color: "var(--accent-ink)" }}
                      >
                        {group}
                      </span>
                    </div>
                  ) : null}
                  <div role="row" className={a.xrow}>
                    <span role="rowheader" style={{ fontWeight: 600, fontSize: 14 }}>
                      {label}
                    </span>
                    {(["admin", "desk", "design", "prod", "delivery"] as RoleKey[]).map((r) => {
                      const on = r === "admin" ? true : perms[r].includes(key);
                      return (
                        <span key={r} role="cell" style={{ textAlign: "center" }}>
                          <button
                            className={cn(a.cb, on ? a.cbOn : a.cbOff)}
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            aria-label={`${ROLE[r]}: ${label}`}
                            disabled={r === "admin" || !canEditMatrix}
                            onClick={() => {
                              if (r === "admin") return;
                              togglePerm(r, key, label, !on);
                            }}
                          >
                            <Ic d={P.ok} size={15} stroke={3} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section
            className={cn(k.card, s.up, s.d2)}
            aria-labelledby="sec-h"
            style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
          >
            <h2 id="sec-h" className={k.h2}>
              الأمان
            </h2>
            {SECURITY.map(([key, label, desc, icon]) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 16,
                  background: "var(--tint)",
                  boxShadow: "inset 0 0 0 1px var(--tint-bd)",
                }}
              >
                <span className={k.tile} aria-hidden="true" style={{ width: 38, height: 38 }}>
                  <Ic d={icon} size={18} />
                </span>
                <span style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <strong className={k.strong} style={{ fontSize: 14 }}>
                    {label}
                  </strong>
                  <span className={k.muted} style={{ fontSize: 12 }}>
                    {desc}
                  </span>
                </span>
                <Switch
                  on={sec[key]}
                  label={label}
                  onToggle={() => {
                    const next = !sec[key];
                    setSec((o) => ({ ...o, [key]: next }));
                    flash(`${next ? "فُعّل: " : "أُوقف: "}${label}`);
                  }}
                />
              </div>
            ))}
          </section>
          <section
            className={cn(k.card, s.up, s.d3)}
            aria-labelledby="ses-h"
            style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}
          >
            <h2 id="ses-h" className={k.h2}>
              الأجهزة التي سُجّل الدخول منها
            </h2>
            {sessions.map((d) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className={k.tile} aria-hidden="true" style={{ width: 38, height: 38 }}>
                  <Ic d={/هاتف|موبايل|iPhone|Android/i.test(d.name) ? MOBILE : LAPTOP} size={18} />
                </span>
                <span style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <strong className={k.strong} style={{ fontSize: 14 }}>
                    {d.name}
                  </strong>
                  <span className={k.muted} style={{ fontSize: 12 }}>
                    {d.when}
                  </span>
                </span>
                {d.current ? <span className={cn(k.badge, k.bOk)}>هذا الجهاز</span> : null}
              </div>
            ))}
            <button
              className={cn(k.btn, k.line)}
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await signOutOtherDevicesAction();
                  if (!result.ok) return flash(result.error);
                  flash("سُجّل الخروج من جميع الأجهزة الأخرى");
                  router.refresh();
                })
              }
              style={{
                alignSelf: "flex-start",
                minHeight: 40,
                padding: "4px 16px",
                borderRadius: 999,
                fontSize: 13,
              }}
            >
              تسجيل الخروج من الأجهزة الأخرى
            </button>
          </section>
        </div>
      </div>

      <section
        className={cn(k.card, s.up, s.d3)}
        aria-labelledby="lg-h"
        style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}
      >
        <h2 id="lg-h" className={k.h2}>
          سجل نشاط الإدارة
        </h2>
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {log.map((l, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                fontSize: 14,
                lineHeight: "22px",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  marginTop: 6,
                  flexShrink: 0,
                  borderRadius: 999,
                  background: "#7ee8c7",
                  boxShadow: "0 0 0 3px rgba(126,232,199,0.25), 0 0 8px rgba(126,232,199,0.7)",
                }}
              />
              <time className={k.muted} style={{ flexShrink: 0, minWidth: 150, fontWeight: 600 }}>
                {l.t}
              </time>
              <span>{l.m}</span>
            </li>
          ))}
        </ol>
      </section>

      {invite ? (
        <InviteDialog
          onClose={() => setInvite(false)}
          onSent={(name, role) => {
            setLog((all) => [
              { t: "الآن", m: `أرسل دعوة إلى ${name} بدور ${ROLE[role]}.` },
              ...all,
            ]);
            flash(`أُرسلت الدعوة إلى ${name}`);
            router.refresh();
          }}
        />
      ) : null}
      <KitToast text={toast} onClose={hide} />
    </div>
  );
}

/** «دعوة عضو» (brief A6.2): creates a single-use invite link to share with the new member. */
function InviteDialog({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (name: string, role: RoleKey) => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [role, setRole] = useState<RoleKey>("desk");
  const [err, setErr] = useState("");
  const [link, setLink] = useState<{ url: string; expiresAt: string; phone: string | null } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  const field = (id: string, label: string, input: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label className={k.lbl} htmlFor={id}>
        {label}
      </label>
      {input}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className={s.fade}
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--overlay)",
          WebkitBackdropFilter: "blur(4px)",
          backdropFilter: "blur(4px)",
        }}
      />
      <form
        className={cn(k.card, s.pop)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-h"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !contact.trim()) {
            setErr("اكتب الاسم ورقم الهاتف أو البريد الإلكتروني.");
            return;
          }
          startTransition(async () => {
            const result = await inviteStaffAction({ contact, roleKey: role });
            if (!result.ok) {
              setErr(
                result.fieldErrors?.contact?.[0] ??
                  result.fieldErrors?.roleKey?.[0] ??
                  result.error,
              );
              return;
            }
            setLink({
              url: result.data.inviteUrl,
              expiresAt: result.data.expiresAt,
              phone: normalizeEgyptianMobile(contact),
            });
            onSent(name.trim(), role);
          });
        }}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 460,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: "var(--sheet-bg)",
        }}
      >
        <h2 id="inv-h" ref={heading} tabIndex={-1} className={k.h1} style={{ fontSize: 21 }}>
          دعوة عضو جديد
        </h2>
        {link ? (
          <>
            <p
              className={k.tint}
              style={{ margin: 0, padding: "10px 14px", fontSize: 13, lineHeight: "22px" }}
            >
              الرابط جاهز. أرسله إلى العضو — يعمل مرة واحدة حتى{" "}
              {formatDateTime(new Date(link.expiresAt))} [المدة للتأكيد].
            </p>
            <input className={k.fld} readOnly dir="ltr" value={link.url} aria-label="رابط الدعوة" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button
                className={cn(k.btn, k.soft)}
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(link.url).catch(() => undefined);
                  setCopied(true);
                }}
                style={{ minHeight: 44, padding: "0 18px", borderRadius: 999 }}
              >
                <Ic d={P.link} size={16} />
                {copied ? "نُسخ ✓" : "انسخ الرابط"}
              </button>
              {link.phone ? (
                <a
                  className={cn(k.btn, k.cta)}
                  href={`https://wa.me/${toInternational(link.phone)}?text=${encodeURIComponent(
                    `مرحبًا! هذه دعوتك للانضمام إلى فريق يوزرسيف. افتح الرابط واختر كلمة مرور: ${link.url}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ minHeight: 44, padding: "0 18px", borderRadius: 999 }}
                >
                  <Ic d={P.chat} size={16} />
                  أرسل عبر واتساب
                </a>
              ) : null}
              <button
                className={cn(k.btn, k.soft)}
                type="button"
                onClick={onClose}
                style={{ minHeight: 44, padding: "0 18px", borderRadius: 999 }}
              >
                حسنًا
              </button>
            </div>
          </>
        ) : (
          <>
            {field(
              "iv-name",
              "الاسم",
              <input
                className={k.fld}
                id="iv-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErr("");
                }}
              />,
            )}
            {field(
              "iv-ph",
              "رقم الهاتف أو البريد الإلكتروني",
              <input
                className={k.fld}
                id="iv-ph"
                type="text"
                dir="ltr"
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value);
                  setErr("");
                }}
                aria-invalid={err ? true : undefined}
                style={{ textAlign: "right" }}
              />,
            )}
            {field(
              "iv-role",
              "الدور",
              <select
                className={k.fld}
                id="iv-role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as RoleKey);
                  setErr("");
                }}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE[r]}
                  </option>
                ))}
              </select>,
            )}
            <p
              className={k.tint}
              style={{ margin: 0, padding: "10px 14px", fontSize: 13, lineHeight: "22px" }}
            >
              سيصله رابط دعوة يفعّل به حسابه [مدة صلاحية الرابط بانتظار التأكيد].
            </p>
            {err ? (
              <p
                role="alert"
                style={{
                  margin: 0,
                  padding: "8px 12px",
                  borderRadius: 12,
                  background: "var(--warn-bg)",
                  border: "1px solid var(--warn-bd)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {err}
              </p>
            ) : null}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className={cn(k.btn, k.cta)}
                type="submit"
                disabled={pending}
                style={{ flex: "1 1 auto", minHeight: 48, borderRadius: 999 }}
              >
                أرسل الدعوة
              </button>
              <button
                className={cn(k.btn, k.soft)}
                type="button"
                onClick={onClose}
                style={{ minHeight: 48, padding: "0 22px", borderRadius: 999 }}
              >
                إلغاء
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
