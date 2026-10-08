"use client";

import { useEffect, useRef } from "react";
import { completeDailyMission } from "@/app/streaks/actions";
import { ClipsReel, type ClipReelItem } from "@/components/clips/clips-reel";

/** Marks the daily “watch clips” mission once per visit. */
export function ClipsReelWithStreak({ clips }: { clips: ClipReelItem[] }) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    void completeDailyMission("clip");
  }, []);

  return <ClipsReel clips={clips} />;
}
