'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  return { d, h, m, s };
}

export function ContestCountdown({
  targetDate,
  compact = false,
}: {
  targetDate: string;
  compact?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    const id = setInterval(() => {
      const tl = getTimeLeft(targetDate);
      setTimeLeft(tl);
      if (!tl) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!timeLeft) return null;

  if (compact) {
    const parts: string[] = [];
    if (timeLeft.d > 0) parts.push(`${timeLeft.d}d`);
    if (timeLeft.h > 0 || timeLeft.d > 0) parts.push(`${timeLeft.h}h`);
    if (timeLeft.d === 0) parts.push(`${timeLeft.m}m`);
    return (
      <span className="tabular-nums text-sm text-amber-600 dark:text-amber-400 font-medium">
        {parts.join(' ')} until open
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
      <div className="text-sm text-amber-700 dark:text-amber-300">
        <span className="font-medium">Registration opens in</span>{' '}
        <span className="tabular-nums font-bold">
          {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
        </span>
      </div>
    </div>
  );
}
