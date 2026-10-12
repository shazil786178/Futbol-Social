"use client";

import { useEffect } from "react";

export function ProFlagClient({ isPro }: { isPro: boolean }) {
  useEffect(() => {
    const el = document.documentElement;
    if (isPro) el.dataset.pro = "1";
    else delete el.dataset.pro;
  }, [isPro]);
  return null;
}
