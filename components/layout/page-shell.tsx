export function PageShell({
  children,
  wide = false,
  full = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
  /** Dashboard-width pages (fantasy, start screen) */
  full?: boolean;
}) {
  const width = full ? "max-w-6xl" : wide ? "max-w-4xl" : "max-w-2xl";
  return (
    <div className="flex min-h-full flex-1 flex-col text-[var(--beige)]">
      <div className={`fs-page-in mx-auto w-full flex-1 px-4 py-9 sm:py-12 ${width}`}>
        {children}
      </div>
    </div>
  );
}
