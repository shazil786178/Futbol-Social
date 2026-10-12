"use client";

import { useEffect, useRef } from "react";
import { completeDailyMission } from "@/app/streaks/actions";
import {
  ClipsReel,
  type ClipReelItem,
  type ReelTabKey,
} from "@/components/clips/clips-reel";

/** Marks the daily "watch clips" mission once per visit. */
export function ClipsReelWithStreak({
  clips,
  tab,
  counts,
  signedIn,
  startId,
}: {
  clips: ClipReelItem[];
  tab?: ReelTabKey;
  counts?: Partial<Record<ReelTabKey, number>>;
  signedIn?: boolean;
  startId?: string | null;
}) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    void completeDailyMission("clip");
  }, []);

  return (
    <ClipsReel
      clips={clips}
      tab={tab}
      counts={counts}
      signedIn={signedIn}
      startId={startId}
    />
  );
}
