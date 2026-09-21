import type { ReactNode } from "react";

/**
 * Wraps every customer-facing screen. On a phone it fills the viewport edge to
 * edge like a native app; on a wider viewport it renders as a centered,
 * fixed-width column instead of stretching — so desktop never looks like a
 * demo/preview of a mobile site.
 */
export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-[#EDE4D8] dark:bg-[#000000] md:items-center md:py-8">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-bg text-body md:h-[min(844px,90vh)] md:w-[430px] md:rounded-[32px] md:border md:border-border md:shadow-2xl">
        {children}
      </div>
    </div>
  );
}
