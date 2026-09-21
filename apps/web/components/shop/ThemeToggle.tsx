"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "29foods.theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0A0A0A" : "#FFF8F0");
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable — theme just won't persist across reloads this session
  }
}

/** A real, functional dark-mode switch — not just the automatic system-preference detection in the root layout's init script. */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  return (
    <button
      onClick={() => {
        const next = isDark ? "light" : "dark";
        applyTheme(next);
        setIsDark(!isDark);
      }}
      className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--color-body))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
      <span className="flex-grow text-[13.5px] font-semibold text-heading">Dark mode</span>
      <span
        className="relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors"
        style={{ background: isDark ? "rgb(var(--color-accent))" : "#D8CBB9" }}
      >
        <span
          className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-transform"
          style={{ transform: isDark ? "translateX(18px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}
