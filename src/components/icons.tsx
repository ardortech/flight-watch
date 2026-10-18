export function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

/** Language-neutral placeholder while a page that needs request data loads. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" className="flex animate-pulse flex-col gap-4">
      <div className="h-6 w-32 rounded bg-line" />
      <div className="h-10 w-64 rounded bg-line" />
      <div className="h-40 rounded-xl bg-line/60" />
    </div>
  );
}
