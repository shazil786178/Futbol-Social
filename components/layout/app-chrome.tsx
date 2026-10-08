"use client";

import { usePathname } from "next/navigation";

export function AppChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const immersive =
    pathname.startsWith("/clips") || pathname.startsWith("/highlights");

  return (
    <>
      {immersive ? null : header}
      {children}
      {immersive ? null : footer}
    </>
  );
}
