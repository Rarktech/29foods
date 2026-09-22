import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/shop/ServiceWorkerRegister";

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
// before first paint — the `dark` class, the `theme-color` meta tag (Chrome/
// Android + Safari's address bar since iOS 15), and the apple status-bar-style
// meta tag (Safari's top status bar when added to the home screen — iOS never
// read theme-color for that surface) — so browser chrome matches immediately
// on both platforms instead of flashing light then repainting dark.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('29foods.theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'#0A0A0A':'#FFF8F0');var s=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(s)s.setAttribute('content',t==='dark'?'black-translucent':'default');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={interTight.variable} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#FFF8F0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
