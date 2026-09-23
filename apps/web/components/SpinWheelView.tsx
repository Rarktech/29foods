"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PRIZES, REDEMPTION_WINDOW_HOURS, type Prize } from "@29foods/core";
import pepperPointer from "@/public/images/misc/pepper-pointer.png";

const SEGMENT_ANGLE = 45;
const EXTRA_SPINS = 5;
const SPIN_DURATION_MS = 4300;

// Boundary points on the r=138 ring, clockwise from 12 o'clock — wedge i spans
// BOUNDARY_POINTS[i] to BOUNDARY_POINTS[i+1], matching PRIZES' index order exactly.
const BOUNDARY_POINTS: [number, number][] = [
  [150, 12], [247.58, 52.42], [288, 150], [247.58, 247.58],
  [150, 288], [52.42, 247.58], [12, 150], [52.42, 52.42],
];
function wedgePath(i: number): string {
  const [x1, y1] = BOUNDARY_POINTS[i]!;
  const [x2, y2] = BOUNDARY_POINTS[(i + 1) % 8]!;
  return `M150,150 L${x1},${y1} A138,138 0 0,1 ${x2},${y2} Z`;
}

const WEDGE_FILL = [
  "fill-accent", // 10% off
  "fill-[#1A1613] dark:fill-[#0A0A0A]", // free Fanta
  "fill-accent", // ₦500 off
  "fill-[#1A1613] dark:fill-[#0A0A0A]", // try again
  "fill-[#1A1613] dark:fill-[#0A0A0A]", // free food
  "fill-[#1A1613] dark:fill-[#0A0A0A]", // ₦1,000 off
  "fill-[#FFB25C] dark:fill-[#F0C989]", // 20% off (jackpot)
  "fill-[#1A1613] dark:fill-[#0A0A0A]", // free delivery
];

// Label anchor per wedge — every label group counter-rotates around its own anchor
// so it (and, for the image wedges, the thumbnail) always reads upright and
// horizontal on screen, no matter how the wheel underneath has spun.
const LABEL_ANCHOR: [number, number][] = [
  [188.27, 57.61], [242.39, 111.73], [242.39, 188.27], [188.27, 242.39],
  [111.73, 242.39], [57.61, 188.27], [57.61, 111.73], [111.73, 57.61],
];

const TEXT_WEDGES: Record<number, { lines: { text: string; dy: number; size: number; cls: string; bold?: boolean }[] }> = {
  0: { lines: [{ text: "10%", dy: -7, size: 13, cls: "fill-white" }, { text: "OFF", dy: 8, size: 10, cls: "fill-[#FFE3DE] dark:fill-[#FFDAD3]", bold: true }] },
  2: { lines: [{ text: "₦500", dy: -7, size: 13, cls: "fill-white" }, { text: "OFF", dy: 8, size: 10, cls: "fill-[#FFE3DE] dark:fill-[#FFDAD3]", bold: true }] },
  3: { lines: [{ text: "Try", dy: -7, size: 12, cls: "fill-[#D8CBB9] dark:fill-[#A8A29B]" }, { text: "again", dy: 8, size: 12, cls: "fill-[#D8CBB9] dark:fill-[#A8A29B]" }] },
  5: { lines: [{ text: "₦1,000", dy: -7, size: 12, cls: "fill-[#D8CBB9] dark:fill-[#A8A29B]" }, { text: "OFF", dy: 8, size: 9.5, cls: "fill-[#B4A797] dark:fill-[#6B6560]", bold: true }] },
  6: { lines: [{ text: "20%", dy: -7, size: 14, cls: "fill-[#1A1613]" }, { text: "OFF", dy: 8, size: 9.5, cls: "fill-[#6B4A1E]" }] },
  7: { lines: [{ text: "Free", dy: -7, size: 12, cls: "fill-[#D8CBB9] dark:fill-[#A8A29B]" }, { text: "delivery", dy: 8, size: 11, cls: "fill-[#B4A797] dark:fill-[#6B6560]" }] },
};

// The two "photo" wedges (Fanta, food) show a small upright thumbnail instead of
// a full-bleed clipped photo — a full-bleed image inside the wheel's own rotating
// SVG can't be kept upright without its clip window sweeping oddly across a frozen
// photo, so a small counter-rotating thumbnail (same technique as the text) is the
// clean way to keep it "horizontally aligned" the way the text labels are.
const IMAGE_WEDGES: Record<number, { src: string; alt: string; label: string }> = {
  1: { src: "/images/menu/fanta-35cl.jpg", alt: "Fanta", label: "Fanta" },
  4: { src: "/images/menu/party-jollof.jpg", alt: "Free food", label: "Food" },
};

function SpinResultCode({ prize, expiresAt }: { prize: Prize; expiresAt: string | null }) {
  const hours = expiresAt ? Math.max(1, Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000)) : REDEMPTION_WINDOW_HOURS;
  return (
    <div className="my-4 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#F5C6BE] bg-accent-tint px-4 py-2.5 dark:border-[#4A2620]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-accent" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 7.3 12.7 15a1 1 0 0 1-1.4 0L3.5 7.3" />
        <rect x="3.5" y="5" width="17" height="14" rx="2" />
      </svg>
      <span className="text-[13px] font-extrabold tracking-[0.02em] text-accent">{prize.key}</span>
      <span className="text-[11px] text-muted">· expires in {hours}h</span>
    </div>
  );
}

export function SpinWheelView({ initialSpinsLeft }: { initialSpinsLeft: number }) {
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinsLeft, setSpinsLeft] = useState(initialSpinsLeft);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ index: number; prize: Prize; expiresAt: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function spin() {
    if (spinning || spinsLeft <= 0) return;
    setSpinning(true);
    setShowResult(false);
    setError(null);

    let index: number;
    let expiresAt: string | null;
    try {
      const res = await fetch("/api/spin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setSpinning(false);
        return;
      }
      index = data.index;
      expiresAt = data.expiresAt ?? null;
    } catch {
      setError("Network error — try again.");
      setSpinning(false);
      return;
    }

    const targetMid = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const base = (360 - targetMid) % 360;
    const currentFullTurns = Math.floor(wheelRotation / 360) + 1;
    setWheelRotation((currentFullTurns + EXTRA_SPINS) * 360 + base);

    setTimeout(() => {
      setSpinning(false);
      setShowResult(true);
      setResult({ index, prize: PRIZES[index]!, expiresAt });
      if (!PRIZES[index]!.tryAgain) setSpinsLeft(0);
    }, SPIN_DURATION_MS);
  }

  function dismissResult() {
    setShowResult(false);
    setResult(null);
  }

  function spinAgain() {
    setShowResult(false);
    setResult(null);
    spin();
  }

  const wheelRotationNeg = -wheelRotation;
  const isTryAgain = !!result?.prize.tryAgain;
  const hubLabel = spinning ? "…" : spinsLeft > 0 ? "SPIN" : "DONE";

  return (
    <div className="flex h-screen flex-col bg-bg">
      <div className="relative z-[5] flex shrink-0 items-center gap-3 px-[18px] pb-3 pt-4">
        <Link href="/" aria-label="Back" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-heading))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <h1 className="flex-grow text-[18px] font-extrabold text-heading">Spin &amp; Win</h1>
        <div className="flex items-center gap-[5px] rounded-full bg-accent-tint px-3 py-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="stroke-accent" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20" /></svg>
          <span className="text-[11.5px] font-extrabold text-accent">{spinsLeft} left today</span>
        </div>
      </div>

      <div className="scrollbar-none flex flex-grow flex-col items-center overflow-hidden px-5 pt-1">
        <div className="relative z-[5] mt-2 flex w-[84%] shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card p-[14px]">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted">How it works</div>
          {[
            "One free spin per day — more when you order.",
            "Every slice wins — worst case, you try again tomorrow.",
            `Discounts and free items land in your cart automatically for ${REDEMPTION_WINDOW_HOURS} hours.`,
          ].map((line, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-tint text-[10.5px] font-extrabold text-accent">{i + 1}</span>
              <span className="text-[12px] leading-[1.4] text-body">{line}</span>
            </div>
          ))}
        </div>

        {error && <div className="relative z-[5] mt-2 text-[12px] font-semibold text-accent">{error}</div>}

        {/* Wheel: oversized, full-bleed, clipped at the screen edges and flush against the bottom */}
        <div className="relative mt-2.5 w-[calc(100%+40px)] flex-grow overflow-hidden" style={{ margin: "10px -20px 0 -20px" }}>
          <Image
            src={pepperPointer}
            alt=""
            className="pointer-events-none absolute left-1/2 top-[10px] z-[4] h-[260px] w-auto -translate-x-1/2 drop-shadow-[0_3px_4px_rgba(60,40,20,0.25)] dark:drop-shadow-[0_3px_4px_rgba(0,0,0,0.5)]"
            priority
          />

          <div className="absolute left-1/2 top-[142px] h-[500px] w-[500px] -translate-x-1/2">
            <div className="absolute inset-0 rounded-full bg-[#1A1613] shadow-[0_14px_34px_rgba(60,40,20,0.24)] dark:bg-[#171717] dark:shadow-[0_14px_34px_rgba(0,0,0,0.55)]" />

            <svg
              width="480"
              height="480"
              viewBox="0 0 300 300"
              className="absolute left-[10px] top-[10px] rounded-full"
              style={{ transform: `rotate(${wheelRotation}deg)`, transition: "transform 4.2s cubic-bezier(0.15, 0.65, 0.15, 1)" }}
            >
              <circle cx="150" cy="150" r="144" className="fill-accent-tint dark:fill-[#201A18]" />
              {WEDGE_FILL.map((cls, i) => (
                <path key={i} d={wedgePath(i)} className={cls} />
              ))}
              <circle cx="150" cy="150" r="138" fill="none" className="stroke-[#FFE3DE] dark:stroke-[#3A2420]" strokeWidth="1.5" opacity={0.5} />

              <g fontFamily="Inter Tight, sans-serif" fontWeight={800} textAnchor="middle" dominantBaseline="middle">
                {LABEL_ANCHOR.map(([ax, ay], i) => (
                  <g key={i} style={{ transformOrigin: `${ax}px ${ay}px`, transition: "transform 4.2s cubic-bezier(0.15, 0.65, 0.15, 1)", transform: `rotate(${wheelRotationNeg}deg)` }}>
                    {TEXT_WEDGES[i]?.lines.map((line, li) => (
                      <text key={li} x={ax} y={ay + line.dy} fontSize={line.size} fontWeight={line.bold ? 700 : undefined} className={line.cls}>{line.text}</text>
                    ))}
                    {IMAGE_WEDGES[i] && (
                      <>
                        <clipPath id={`spinThumb${i}`}>
                          <circle cx={ax} cy={ay - 9} r={15} />
                        </clipPath>
                        <image href={IMAGE_WEDGES[i]!.src} x={ax - 15} y={ay - 24} width={30} height={30} preserveAspectRatio="xMidYMid slice" clipPath={`url(#spinThumb${i})`} />
                        <circle cx={ax} cy={ay - 9} r={15} fill="none" className="stroke-white/70 dark:stroke-white/40" strokeWidth={1.5} />
                        <text x={ax} y={ay + 16} fontSize={11} className="fill-white dark:fill-[#FAF6F0]">{IMAGE_WEDGES[i]!.label}</text>
                      </>
                    )}
                  </g>
                ))}
              </g>
            </svg>

            <button
              onClick={spin}
              aria-label="Spin the wheel"
              className="hub-btn absolute left-1/2 top-1/2 z-[2] flex h-[74px] w-[74px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full border-4 border-accent-tint bg-accent shadow-[0_6px_16px_rgba(196,30,30,0.35)] dark:shadow-[0_6px_16px_rgba(224,40,31,0.4)]"
              style={{ opacity: spinsLeft > 0 && !spinning ? 1 : 0.55 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" /><path d="M3 21v-5h5" /></svg>
              <span className="text-[10.5px] font-extrabold tracking-[0.04em] text-white">{hubLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {showResult && result && (
        <div className="absolute inset-0 z-10 flex items-end bg-[rgba(26,22,19,0.55)] dark:bg-[rgba(0,0,0,0.65)]">
          <div className="sheet-pop relative w-full overflow-hidden rounded-t-[26px] bg-card p-[26px] px-6 pb-[30px]">
            <span className="confetti-dot absolute left-[26px] top-[14px] h-[6px] w-[6px] rounded-full bg-[#FFB25C] dark:bg-[#F0C989]" />
            <span className="confetti-dot absolute right-10 top-[10px] h-[5px] w-[5px] rounded-full bg-accent" style={{ animationDelay: "0.3s" }} />
            <span className="confetti-dot absolute left-[120px] top-[18px] h-[5px] w-[5px] rounded-full bg-success" style={{ animationDelay: "0.55s" }} />
            <span className="confetti-dot absolute right-[100px] top-2 h-[6px] w-[6px] rounded-full bg-[#FFB25C] dark:bg-[#F0C989]" style={{ animationDelay: "0.15s" }} />

            <div className={`mx-auto mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-full ${isTryAgain ? "bg-[#F3E8DA] dark:bg-[#201A18]" : "bg-success-bg"}`}>
              {isTryAgain ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-muted" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" /><path d="M3 21v-5h5" /></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-success" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              )}
            </div>

            <div className="mb-1.5 text-center">
              <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-muted">{isTryAgain ? "So close" : "You won"}</div>
              <h2 className="mb-2 text-[22px] font-extrabold text-heading">{isTryAgain ? "One more spin" : `You won ${result.prize.label}!`}</h2>
              <div className="mx-auto max-w-[260px] text-[13px] leading-[1.45] text-body">{result.prize.copy}</div>
            </div>

            {!isTryAgain && <SpinResultCode prize={result.prize} expiresAt={result.expiresAt} />}

            {isTryAgain ? (
              <button onClick={spinAgain} className="mt-1 block w-full rounded-2xl bg-heading py-3.5 text-center text-sm font-bold text-bg">Spin again</button>
            ) : (
              <Link href="/" className="block w-full rounded-2xl bg-heading py-3.5 text-center text-sm font-bold text-bg">Order now</Link>
            )}
            <button onClick={dismissResult} className="w-full py-3 text-center text-[12.5px] font-bold text-muted">Not now</button>
          </div>
        </div>
      )}
    </div>
  );
}
