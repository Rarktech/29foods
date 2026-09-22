import { COPILOT_EXCHANGES, COPILOT_SUGGESTIONS, type CopilotStatCard } from "@/components/admin/copilot/data";

// Mobile-dark uses a distinct warmer palette in this reference batch; desktop
// and light mode stay on the standard admin tokens (`lg:dark:` resets them).
const CARD = "border border-border dark:border-[#3A2F26] lg:dark:border-border bg-card dark:bg-[#241D17] lg:dark:bg-card";
const HEADING = "text-heading dark:text-[#F5EDE3] lg:dark:text-heading";
const MUTED = "text-muted dark:text-[#8A7D6E] lg:dark:text-muted";
const BODY = "text-body dark:text-[#C9BCAC] lg:dark:text-body";

function statBoxClass(tone: CopilotStatCard["tone"]) {
  if (tone === "negative") return "border border-admin-danger-border bg-admin-danger dark:border-[#4A2620] dark:bg-[#2E1815] lg:dark:border-admin-danger-border lg:dark:bg-admin-danger";
  if (tone === "positive") return "border border-[#B7E4C7] bg-success-bg dark:border-[#234A34] dark:bg-[#16281E] lg:dark:border-success lg:dark:bg-success-bg";
  return CARD;
}
function statLabelClass(tone: CopilotStatCard["tone"]) {
  if (tone === "negative") return "text-accent dark:text-[#E8998F] lg:dark:text-accent";
  if (tone === "positive") return "text-success dark:text-[#6FCB93] lg:dark:text-success";
  return MUTED;
}
function statValueClass(tone: CopilotStatCard["tone"]) {
  if (tone === "negative") return "text-accent";
  if (tone === "positive") return "text-success dark:text-[#6FCB93] lg:dark:text-success";
  return HEADING;
}

export default function AdminCopilotPage() {
  return (
    <div className="bg-bg dark:bg-[#17120E] lg:dark:bg-bg">
      <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-bg px-5 dark:border-[#3A2F26] dark:bg-[#17120E] lg:dark:border-border lg:dark:bg-bg lg:px-7">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]" style={{ background: "linear-gradient(135deg, rgb(var(--color-accent)) 0%, #9E1717 100%)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5" /><path d="M12 8.5 13 11l2.5 1-2.5 1-1 2.5-1-2.5L8.5 12l2.5-1Z" /></svg>
          </div>
          <h1 className={`text-[15px] font-extrabold lg:text-[16px] ${HEADING}`}>
            <span className="lg:hidden">Copilot</span>
            <span className="hidden lg:inline">29Foods Copilot</span>
          </h1>
        </div>
        <span className="hidden shrink-0 rounded-full bg-success-bg px-3 py-[5px] text-[11px] font-bold text-success lg:inline-block">Knows your last 30 days</span>
      </div>

      <div className="flex lg:items-start">
        <div className="flex min-w-0 flex-grow flex-col gap-4 p-5 lg:gap-5 lg:p-7">
          {COPILOT_EXCHANGES.map((ex, i) => (
            <div key={i} className="flex flex-col gap-3 lg:gap-2.5">
              <div className="flex justify-end">
                <div className="max-w-[260px] rounded-[14px_14px_4px_14px] bg-[#F5EDE3] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#17120E] dark:bg-[#F5EDE3] dark:text-[#17120E] lg:max-w-[480px] lg:bg-heading lg:text-bg lg:dark:bg-heading lg:dark:text-bg">
                  {ex.question}
                </div>
              </div>
              <div className="flex items-start gap-2 lg:gap-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] lg:h-7 lg:w-7 lg:rounded-lg" style={{ background: "linear-gradient(135deg, rgb(var(--color-accent)) 0%, #9E1717 100%)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5" /><path d="M12 8.5 13 11l2.5 1-2.5 1-1 2.5-1-2.5L8.5 12l2.5-1Z" /></svg>
                </div>
                <div className="max-w-[300px] lg:max-w-[620px]">
                  <div className={`rounded-[4px_14px_14px_14px] p-3.5 text-[12px] leading-[1.5] lg:p-4 lg:text-[13px] ${CARD} ${BODY}`}>
                    {ex.answerParts.map((part, j) =>
                      typeof part === "string" ? <span key={j}>{part}</span> : <strong key={j} className={HEADING}>{part.bold}</strong>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 lg:mt-2.5 lg:grid-cols-2 lg:gap-2.5">
                    {ex.stats.map((s, k) => (
                      <div key={k} className={`rounded-xl2 p-2.5 lg:p-3.5 ${statBoxClass(s.tone)}`}>
                        <p className={`mb-1 text-[9.5px] font-bold uppercase tracking-[0.04em] lg:mb-1.5 lg:text-[10px] ${statLabelClass(s.tone)}`}>{s.label}</p>
                        <p className={`text-[12px] font-extrabold lg:text-[13px] ${statValueClass(s.tone)}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Mobile: suggestions as a horizontal pill row below the conversation */}
          <div className="lg:hidden">
            <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.05em] ${MUTED}`}>Suggested questions</p>
            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-0.5">
              {COPILOT_SUGGESTIONS.map((s) => (
                <button key={s} className={`max-w-[220px] shrink-0 whitespace-normal rounded-[10px] px-3 py-2.5 text-left text-[11.5px] font-semibold ${CARD} ${BODY}`}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop: suggestions rail */}
        <div className="sticky top-16 hidden w-[240px] shrink-0 self-start border-l border-border p-5 lg:block">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted">Suggested questions</p>
          <div className="flex flex-col gap-2">
            {COPILOT_SUGGESTIONS.map((s) => (
              <button key={s} className="rounded-[10px] border border-border bg-card px-3 py-2.5 text-left text-[12px] font-semibold text-body">{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-bg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-[#3A2F26] dark:bg-[#17120E] lg:dark:border-border lg:dark:bg-bg lg:p-4 lg:px-7">
        <div className={`flex items-center gap-2 rounded-[14px] py-1.5 pl-3.5 pr-1.5 lg:gap-2.5 ${CARD}`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${MUTED}`}><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5" /><path d="M12 8.5 13 11l2.5 1-2.5 1-1 2.5-1-2.5L8.5 12l2.5-1Z" /></svg>
          <span className={`flex-grow text-[12.5px] ${MUTED}`}>Ask about your business...</span>
          <button aria-label="Send" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#F5EDE3] dark:bg-[#F5EDE3] lg:h-9 lg:w-9 lg:bg-heading lg:dark:bg-heading">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#17120E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="lg:hidden"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-bg))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="hidden lg:block"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
