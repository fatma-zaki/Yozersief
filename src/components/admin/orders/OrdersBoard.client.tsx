"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  advanceStageAction,
  cancelOrderAction,
  decideOrderAction,
  editOrderAction,
  saveInternalNoteAction,
} from "@/app/(dashboard)/dashboard/orders/actions";
import type { FieldErrors } from "@/lib/errors";
import type { AdminOrdersData } from "@/modules/orders";
import type { Order, OrderStatus } from "./data";
import { DecisionDialog, Toast } from "./DecisionDialog.client";
import { EditOrderDialog } from "./EditOrderDialog.client";
import { dialogSpec, isOrg, type DialogKind } from "./logic";
import { OrdersDesktop, OrdersMobile } from "./OrderViews.client";

export type StatusFilter = OrderStatus | "all";
export type TypeFilter = "all" | "person" | "org";

export type BoardState = {
  orders: Order[];
  stats: AdminOrdersData["stats"];
  q: string;
  filter: StatusFilter;
  tfilter: TypeFilter;
  sort: "new" | "old";
  selId: string;
  openId: string;
};

export type Dialog = { kind: DialogKind; id: string; mobile: boolean };
export type ToastState = { text: string; wa: string; mobile: boolean };

/** What the views can ask the board to do on the server. */
export type BoardActions = {
  advance: (r: Order) => void;
  saveNote: (r: Order, note: string) => void;
  busy: boolean;
};

/**
 * Orders (brief B7), from docs/design/Admin.html (desktop) and Admin-Mobile.html (<700px).
 * Data comes from `getAdminOrders`; decisions run the lifecycle on the server, then the page
 * refreshes so the list, counters and logs show what was written.
 */
export function OrdersBoard({ data }: { data: AdminOrdersData }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const first = data.orders[0]?.id ?? "";
  const [ui, setUi] = useState({
    q: "",
    filter: "all" as StatusFilter,
    tfilter: "all" as TypeFilter,
    sort: "new" as "new" | "old",
    selId: first,
    openId: first,
  });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editing, setEditing] = useState<{ id: string; mobile: boolean } | null>(null);
  const [editError, setEditError] = useState<{ text: string; fields: FieldErrors }>({
    text: "",
    fields: {},
  });
  const state: BoardState = { ...ui, orders: data.orders, stats: data.stats };
  const patch = (p: Partial<BoardState>) => setUi((s) => ({ ...s, ...p }));

  const q = ui.q.trim();
  const list = data.orders
    .filter(
      (r) =>
        (ui.tfilter === "all" || (ui.tfilter === "person" ? !isOrg(r) : isOrg(r))) &&
        (ui.filter === "all" || r.status === ui.filter) &&
        (!q || r.ref.toLowerCase().includes(q.toLowerCase()) || r.name.includes(q)),
    )
    .sort((a, b) => (ui.sort === "new" ? b.ts - a.ts : a.ts - b.ts));

  const actions: BoardActions = {
    busy,
    advance: (r) =>
      startTransition(async () => {
        const result = await advanceStageAction({ orderId: r.id });
        if (!result.ok) {
          setToast({ text: result.error, wa: "", mobile: false });
          return;
        }
        setToast({
          text: `سُجّل «${result.data.label}»${result.data.waLink ? " — التحديث جاهز للإرسال" : ""}`,
          wa: result.data.waLink ?? "",
          mobile: false,
        });
        router.refresh();
      }),
    saveNote: (r, note) =>
      startTransition(async () => {
        const result = await saveInternalNoteAction({ orderId: r.id, note });
        if (!result.ok) setToast({ text: result.error, wa: "", mobile: false });
        else router.refresh();
      }),
  };

  const confirm = (d: Dialog, text: string, sendWa: boolean) => {
    const r = data.orders.find((o) => o.id === d.id);
    if (!r) return;
    const spec = dialogSpec(d.kind, r, d.mobile);
    setDialogError("");
    startTransition(async () => {
      const result =
        d.kind === "cancel"
          ? await cancelOrderAction({ orderId: r.id, reason: text })
          : await decideOrderAction({
              orderId: r.id,
              decision: d.kind,
              text,
              notify: d.kind === "approve" ? sendWa : true,
            });
      if (!result.ok) {
        setDialogError(result.error);
        return;
      }
      setDialog(null);
      setToast({
        text: spec.toast + r.ref + (result.data.waLink ? " — رسالة واتساب جاهزة" : ""),
        wa: result.data.waLink ?? "",
        mobile: d.mobile,
      });
      router.refresh();
    });
  };

  const saveEdit = (id: string, mobile: boolean, form: Order["form"]) => {
    setEditError({ text: "", fields: {} });
    startTransition(async () => {
      const result = await editOrderAction({ orderId: id, ...form });
      if (!result.ok) {
        setEditError({ text: result.error, fields: result.fieldErrors ?? {} });
        return;
      }
      setEditing(null);
      setToast({
        text: result.data.changed.length
          ? `عُدّل الطلب ${result.data.ref}: ${result.data.changed.join("، ")}`
          : "لا توجد تغييرات للحفظ.",
        wa: "",
        mobile,
      });
      router.refresh();
    });
  };
  const edit = (mobile: boolean) => (id: string) => {
    setEditError({ text: "", fields: {} });
    setEditing({ id, mobile });
  };
  const editOrder = editing ? data.orders.find((o) => o.id === editing.id) : undefined;

  const dialogOrder = dialog ? data.orders.find((o) => o.id === dialog.id) : undefined;
  const open = (mobile: boolean) => (kind: DialogKind, id: string) => {
    setDialogError("");
    setDialog({ kind, id, mobile });
  };

  return (
    <>
      <OrdersDesktop
        state={state}
        list={list}
        patch={patch}
        open={open(false)}
        edit={edit(false)}
        actions={actions}
      />
      <OrdersMobile
        state={state}
        list={list}
        patch={patch}
        open={open(true)}
        edit={edit(true)}
        actions={actions}
      />
      {editing && editOrder ? (
        <EditOrderDialog
          key={editOrder.id}
          order={editOrder}
          mobile={editing.mobile}
          saving={busy}
          error={editError.text}
          fieldErrors={editError.fields}
          onClose={() => setEditing(null)}
          onSave={(form) => saveEdit(editOrder.id, editing.mobile, form)}
        />
      ) : null}
      {dialog && dialogOrder ? (
        <DecisionDialog
          key={`${dialog.kind}-${dialog.id}`}
          dialog={dialog}
          order={dialogOrder}
          templates={data.templates}
          trackUrl={data.trackUrl}
          saving={busy}
          error={dialogError}
          onClose={() => setDialog(null)}
          onConfirm={(text, sendWa) => confirm(dialog, text, sendWa)}
        />
      ) : null}
      {toast ? <Toast toast={toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
