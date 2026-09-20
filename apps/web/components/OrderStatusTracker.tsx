"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatKobo } from "@/lib/format";

type OrderStatus = "placed" | "paid" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";

const STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: "paid", label: "Order confirmed", emoji: "🔥" },
  { status: "preparing", label: "In the kitchen", emoji: "🍳" },
  { status: "ready", label: "Ready for pickup", emoji: "🍽️" },
  { status: "out_for_delivery", label: "On the way", emoji: "🏍️" },
  { status: "delivered", label: "Delivered", emoji: "✅" },
];

export function OrderStatusTracker(props: { orderId: string; initialStatus: OrderStatus; total: number; lodge: string; room: string | null }) {
  const [status, setStatus] = useState<OrderStatus>(props.initialStatus);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`order-${props.orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${props.orderId}` },
        (payload) => setStatus(payload.new.order_status as OrderStatus),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [props.orderId]);

  if (status === "placed") {
    return <p className="text-neutral-500">Waiting for payment confirmation…</p>;
  }
  if (status === "cancelled") {
    return <p className="font-medium text-red-600">This order was cancelled.</p>;
  }

  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-neutral-500">
          {props.lodge}
          {props.room ? `, ${props.room}` : ""} · {formatKobo(props.total)}
        </p>
        <p className="text-sm text-neutral-400">⏱️ Your food arrives in 30 mins or less</p>
      </div>

      <ol className="flex flex-col gap-4">
        {STEPS.map((step, i) => {
          const done = i <= currentIndex;
          return (
            <li key={step.status} className={`flex items-center gap-3 ${done ? "" : "opacity-40"}`}>
              <span className="text-xl">{step.emoji}</span>
              <span className={done ? "font-medium" : ""}>{step.label}</span>
            </li>
          );
        })}
      </ol>

      {status === "delivered" && <FeedbackPrompt orderId={props.orderId} />}
    </div>
  );
}

function FeedbackPrompt({ orderId }: { orderId: string }) {
  const [sent, setSent] = useState(false);

  async function send(reaction: "fire" | "neutral" | "down") {
    setSent(true); // optimistic — this is a low-stakes reaction, not worth blocking on
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, reaction }),
    });
  }

  if (sent) return <p className="text-center text-neutral-500">Thanks for the feedback! 🙌</p>;

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4 text-center">
      <p className="mb-3 font-medium">How was it?</p>
      <div className="flex justify-center gap-4 text-2xl">
        <button onClick={() => send("fire")} aria-label="Fire">🔥</button>
        <button onClick={() => send("neutral")} aria-label="Neutral">😐</button>
        <button onClick={() => send("down")} aria-label="Not good">👎</button>
      </div>
    </div>
  );
}
