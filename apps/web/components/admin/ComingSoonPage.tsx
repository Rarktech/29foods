export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-1 p-5 lg:p-7">
      <h1 className="text-[20px] font-extrabold text-heading">{title}</h1>
      <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-panel border border-dashed border-muted-border-strong bg-card px-6 py-16 text-center">
        <p className="text-[14px] font-bold text-heading">Coming soon</p>
        <p className="max-w-[320px] text-[12.5px] text-muted">This page hasn&rsquo;t been designed yet — it&rsquo;ll be built once its reference is ready.</p>
      </div>
    </div>
  );
}
