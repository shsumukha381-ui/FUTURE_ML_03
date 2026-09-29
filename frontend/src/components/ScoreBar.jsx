/**
 * Animated score bar — shows a horizontal fill bar with score value.
 * Color shifts from red → amber → green based on score thresholds.
 */

import { useEffect, useState } from "react";
import { formatScore, getScoreBgClass } from "../utils/helpers";

export default function ScoreBar({ score, height = "h-2.5", showLabel = true }) {
  const [width, setWidth] = useState(0);

  // Animate the bar fill on mount
  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative flex-1 overflow-hidden rounded-full bg-slate-100 ${height} dark:bg-slate-700`}
      >
        <div
          className={`${getScoreBgClass(score)} ${height} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(width, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="min-w-[3.5rem] text-right text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
          {formatScore(score)}
        </span>
      )}
    </div>
  );
}
