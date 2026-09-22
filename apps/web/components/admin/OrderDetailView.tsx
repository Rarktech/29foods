"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatKobo } from "@/lib/format";
import { changeOrderStatus, reassignRider, autoAssignRider, logComplaint } from "@/app/admin/(dashboard)/orders/[id]/actions";

const NEXT_STATUS: Record<string, string | null> = {
  placed: "paid",
  paid: "preparing",
  preparing: "ready",
  ready: "out_for_delivery",
  out_for_delivery: "delivered",
  delivered: null,
  cancelled: null,
};

const STATUS_LABEL: Record<string, string> = {
  placed: "Placed",
  paid: "Paid",
  preparing: "Preparing",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface OrderData {
  id: string;
  items: { name: string; qty: number; unit_price: number }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  lodge: string;
  room: string | null;
  orderStatus: string;
  paymentStatus: string;
  channel: string;
  createdAt: string;
  deliveredAt: string | null;
}

interface CustomerData {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  lodge: string | null;
  room: string | null;
  loyaltyPoints: number;
}

export function OrderDetailView({
  order,
  customer,
  otherOrders,
  timeline,
  rider,
  riders,
  hasFeedback,
}: {
  order: OrderData;
  customer: CustomerData | null;
  otherOrders: { id: string; total: number; status: string; createdAt: string }[];
  timeline: { id: string; fromStatus: string | null; toStatus: string; actorType: string; applied: boolean; createdAt: string }[];
  rider: { id: string; name: string; phone: string | null; cycleStatus: string } | null;
  riders: { id: string; name: string; cycleStatus: string }[];
  hasFeedback: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintReason, setComplaintReason] = useState("");
  const [complaintSent, setComplaintSent] = useState(false);

  const nextStatus = NEXT_STATUS[order.orderStatus];

  function handleAdvance() {
    if (!nextStatus) return;
    setError(null);
    startTransition(async () => {
      try {
        await changeOrderStatus(order.id, nextStatus as never);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update status.");
      }
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      try {
        await changeOrderStatus(order.id, "cancelled" as never);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to cancel.");
      }
    });
  }

  function handleAutoAssign() {
    setError(null);
    startTransition(async () => {
      try {
        await autoAssignRider(order.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No riders available.");
      }
    });
  }

  function handleReassign(riderId: string) {
    startTransition(() => reassignRider(order.id, riderId || null));
  }

  function handleLogComplaint(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || !complaintReason.trim()) return;
    startTransition(async () => {
      await logComplaint(order.id, customer.id, complaintReason.trim());
      setComplaintSent(true);
      setComplaintOpen(false);
      setComplaintReason("");
    });
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/dashboard" className="text-[12px] font-semibold text-muted">
            ← Back to orders
          </Link>
          <h1 className="mt-1 text-[20px] font-extrabold text-heading">Order #{order.id.slice(0, 8)}</h1>
        </div>
        <span className="rounded-full bg-accent-tint px-3.5 py-1.5 text-[12px] font-bold capitalize text-accent">
          {STATUS_LABEL[order.orderStatus] ?? order.orderStatus}
        </span>
      </div>

      {error && <p className="rounded-xl2 bg-accent-tint px-4 py-2.5 text-[12.5px] font-semibold text-accent">{error}</p>}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-panel border border-border bg-card p-4">
        {nextStatus && (
          <button
            onClick={handleAdvance}
            disabled={pending}
            className="rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            Mark {STATUS_LABEL[nextStatus]}
          </button>
        )}
        {order.orderStatus !== "cancelled" && order.orderStatus !== "delivered" && (
          <button
            onClick={handleCancel}
            disabled={pending}
            className="rounded-full border border-border px-4 py-2 text-[13px] font-bold text-body disabled:opacity-50"
          >
            Cancel order
          </button>
        )}
        <button
          onClick={() => setComplaintOpen((v) => !v)}
          disabled={hasFeedback || complaintSent}
          className="ml-auto rounded-full border border-border px-4 py-2 text-[13px] font-bold text-body disabled:opacity-50"
        >
          {hasFeedback || complaintSent ? "Complaint logged" : "Log a complaint"}
        </button>
      </div>

      {complaintOpen && customer && (
        <form onSubmit={handleLogComplaint} className="flex flex-col gap-3 rounded-panel border border-border bg-card p-4">
          <textarea
            value={complaintReason}
            onChange={(e) => setComplaintReason(e.target.value)}
            placeholder="What went wrong with this order?"
            rows={3}
            className="rounded-xl2 border border-border bg-bg px-3.5 py-2.5 text-[13px] text-body"
            required
          />
          <button type="submit" disabled={pending} className="self-start rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50">
            Submit complaint
          </button>
        </form>
      )}

      {/* Items + totals */}
      <div className="rounded-panel border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-bold text-heading">Items</p>
        <div className="flex flex-col divide-y divide-border">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-[13px]">
              <span className="text-body">
                {item.qty}x {item.name}
              </span>
              <span className="font-semibold text-heading">{formatKobo(item.unit_price * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-[13px]">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span>{formatKobo(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Delivery</span>
            <span>{formatKobo(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-[14px] font-bold text-heading">
            <span>Total</span>
            <span>{formatKobo(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Customer */}
        <div className="rounded-panel border border-border bg-card p-4">
          <p className="mb-3 text-[13px] font-bold text-heading">Customer</p>
          {customer ? (
            <div className="flex flex-col gap-1 text-[13px]">
              <p className="font-semibold text-heading">{customer.name ?? customer.email ?? "Unnamed"}</p>
              <p className="text-muted">{customer.phone ?? customer.email ?? "No contact on file"}</p>
              <p className="text-muted">
                {order.lodge}
                {order.room ? `, ${order.room}` : ""}
              </p>
              <p className="text-muted">{customer.loyaltyPoints} loyalty pts</p>
            </div>
          ) : (
            <p className="text-[13px] text-muted">Customer record not found.</p>
          )}

          {otherOrders.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-[11.5px] font-semibold text-muted">Other orders</p>
              <div className="flex flex-col gap-1.5">
                {otherOrders.map((o) => (
                  <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-body">{new Date(o.createdAt).toLocaleDateString()}</span>
                    <span className="text-muted">{formatKobo(o.total)} · {o.status.replace(/_/g, " ")}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rider */}
        <div className="rounded-panel border border-border bg-card p-4">
          <p className="mb-3 text-[13px] font-bold text-heading">Rider</p>
          {rider ? (
            <div className="mb-3 flex flex-col gap-1 text-[13px]">
              <p className="font-semibold text-heading">{rider.name}</p>
              <p className="text-muted">{rider.phone ?? "No phone on file"}</p>
              <p className="capitalize text-muted">{rider.cycleStatus.replace(/_/g, " ")}</p>
            </div>
          ) : (
            <p className="mb-3 text-[13px] text-muted">Not yet assigned.</p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <select
              defaultValue=""
              onChange={(e) => e.target.value && handleReassign(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-[13px] text-body"
            >
              <option value="">Assign manually…</option>
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.cycleStatus.replace(/_/g, " ")})
                </option>
              ))}
            </select>
            <button
              onClick={handleAutoAssign}
              disabled={pending}
              className="rounded-full border border-border px-3.5 py-2 text-[12.5px] font-bold text-body disabled:opacity-50"
            >
              Auto-assign
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-panel border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-bold text-heading">Timeline</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="h-2 w-2 shrink-0 rounded-full bg-muted" />
            <span className="text-body">Placed</span>
            <span className="ml-auto text-[11.5px] text-muted">{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          {timeline.map((e) => (
            <div key={e.id} className="flex items-center gap-3 text-[13px]">
              <span className={`h-2 w-2 shrink-0 rounded-full ${e.applied ? "bg-success" : "bg-warning"}`} />
              <span className="capitalize text-body">
                {e.toStatus.replace(/_/g, " ")} <span className="text-muted">· {e.actorType}</span>
              </span>
              <span className="ml-auto text-[11.5px] text-muted">{new Date(e.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
