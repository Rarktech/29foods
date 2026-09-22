/** Shown instantly on navigation via Next's loading.tsx convention, while the target route's data is still fetching. */
export function LoadingSpinner() {
  return (
    <div className="flex flex-grow items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-border"
        style={{ borderTopColor: "rgb(var(--color-accent))" }}
      />
    </div>
  );
}
