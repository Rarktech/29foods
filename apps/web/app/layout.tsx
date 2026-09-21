import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "29Foods",
  description: "Fast, prepaid food delivery to your lodge.",
};

// Resolves the theme (persisted choice, else system preference) and applies it
// before first paint — both the `dark` class and the `theme-color` meta tag, so
// the browser's own chrome (status bar / address bar) matches immediately
// instead of flashing light then repainting dark.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('29foods.theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'#0A0A0A':'#FFF8F0');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={interTight.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FFF8F0" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
