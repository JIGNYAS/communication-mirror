"use client";

import { useEffect, useState } from "react";

export function useCountdown(target: number | null): number {
  const [remaining, setRemaining] = useState(() => target ? Math.max(0, target - Date.now()) : 0);
  useEffect(() => {
    const tick = () => setRemaining(target ? Math.max(0, target - Date.now()) : 0);
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [target]);
  return remaining;
}

