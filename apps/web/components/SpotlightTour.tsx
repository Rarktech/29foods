"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingSeen } from "@/lib/onboarding";
import type { OnboardingKey } from "@/lib/onboarding-keys";

export interface TourStep {
  /** Matches a `data-tour="…"` attribute on the element to highlight. */
  target: string;
  title: string;
  body: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const HOLE_PADDING = 6;
const CARD_GAP = 12;

function findTarget(step: TourStep): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null; // hidden / not rendered right now
}

/**
 * Dims the app and highlights one real control at a time with a short tip. Rendered as
 * an absolute layer inside the shop shell (its nearest positioned ancestor), so it frames
 * correctly on a phone and in the centred desktop column. Steps whose element isn't on
 * screen (no "usual" card, sold-out menu…) are skipped; Skip, Escape or tapping the dimmed
 * area ends it early.
 */
export function SpotlightTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(() => steps.findIndex((s) => !!findTarget(s)));
  const [hole, setHole] = useState<Rect | null>(null);
  const [cardTop, setCardTop] = useState<number | null>(null);

  const step = index >= 0 ? steps[index] : undefined;
  // Counter only counts steps that can actually be shown right now.
  const visibleSteps = steps.filter((s) => !!findTarget(s));
  const position = step ? visibleSteps.indexOf(step) + 1 : 0;
  const isLast = position === visibleSteps.length;

  const measure = useCallback(() => {
    if (!step || !overlayRef.current) return;
    const el = findTarget(step);
    if (!el) return;
    const frame = overlayRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const next: Rect = {
      top: r.top - frame.top - HOLE_PADDING,
      left: r.left - frame.left - HOLE_PADDING,
      width: r.width + HOLE_PADDING * 2,
      height: r.height + HOLE_PADDING * 2,
    };
    setHole(next);
    const cardHeight = cardRef.current?.offsetHeight ?? 150;
    // Below the target if there's room, otherwise above it (e.g. the bottom-nav steps).
    const below = next.top + next.height + CARD_GAP;
    setCardTop(below + cardHeight <= frame.height - 8 ? below : Math.max(8, next.top - CARD_GAP - cardHeight));
  }, [step]);

  // Nothing showable at all: close straight away.
  useEffect(() => {
    if (index === -1) onClose();
  }, [index, onClose]);

  // Bring the target into view, then measure once scrolling settles.
  useLayoutEffect(() => {
    if (!step || !overlayRef.current) return;
    const el = findTarget(step);
    if (!el) return;
    const frame = overlayRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const offScreen = r.top < frame.top + 60 || r.bottom > frame.bottom - 120;
    if (offScreen) el.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const settle = setTimeout(measure, offScreen ? 380 : 0);
    cardRef.current?.focus();
    return () => clearTimeout(settle);
  }, [step, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true); // capture: the page scrolls inside the shell, not the window
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  const go = useCallback(
    (direction: 1 | -1) => {
      let i = index + direction;
      while (i >= 0 && i < steps.length && !findTarget(steps[i]!)) i += direction;
      if (i >= steps.length) onClose();
      else if (i >= 0) setIndex(i);
    },
    [index, steps, onClose],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (!step) return null;
  const single = visibleSteps.length === 1;

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-[60]"
      onClick={(e) => {
        // Tapping the dimmed area skips; taps on the card itself are handled by its buttons.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {hole && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-[16px] transition-all duration-300 ease-out"
          style={{ ...hole, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62), 0 0 0 2px rgb(var(--color-accent))" }}
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        tabIndex={-1}
        className="absolute left-4 right-4 rounded-[20px] bg-card p-4 outline-none transition-[top] duration-300 ease-out"
        style={{ top: cardTop ?? -9999, boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}
      >
        <h3 id="tour-title" className="mb-1 text-[15px] font-extrabold text-heading">
          {step.title}
        </h3>
        <p className="mb-3.5 text-[12.5px] leading-[1.55] text-body">{step.body}</p>

        {single ? (
          <button onClick={onClose} className="w-full rounded-2xl bg-accent px-4 py-2.5 text-[13px] font-bold text-white">
            Got it
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted">
              {position} of {visibleSteps.length}
            </span>
            <button onClick={onClose} className="ml-auto px-2 py-2 text-[12.5px] font-bold text-muted">
              Skip
            </button>
            {position > 1 && (
              <button onClick={() => go(-1)} className="rounded-full border border-border px-3.5 py-2 text-[12.5px] font-bold text-heading">
                Back
              </button>
            )}
            <button onClick={() => go(1)} className="rounded-full bg-accent px-4 py-2 text-[12.5px] font-bold text-white">
              {isLast ? "Done" : "Next →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Shows a tour once per user (see useOnboardingSeen), a moment after the page settles.
 * `force` replays it regardless (You → Settings → Replay app tour links to /?tour=1).
 */
export function TourLauncher({
  tourKey,
  accountSeen,
  steps,
  enabled = true,
  force = false,
}: {
  tourKey: OnboardingKey;
  accountSeen: boolean | null;
  steps: TourStep[];
  /** Extra condition, e.g. the cart tip only once there's something in the cart. */
  enabled?: boolean;
  force?: boolean;
}) {
  const router = useRouter();
  const { seen, ready, markSeen } = useOnboardingSeen(tourKey, accountSeen);
  const [open, setOpen] = useState(false);
  // Closed during this visit — never reopen, even while ?tour=1 is still in the URL.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed || !ready || !enabled || (seen && !force)) return;
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [dismissed, ready, enabled, seen, force]);

  const close = useCallback(() => {
    setOpen(false);
    setDismissed(true);
    markSeen();
    if (force) router.replace("/", { scroll: false }); // drop ?tour=1 so a refresh doesn't replay it
  }, [markSeen, force, router]);

  return open ? <SpotlightTour steps={steps} onClose={close} /> : null;
}
