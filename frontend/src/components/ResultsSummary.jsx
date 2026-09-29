/**
 * ResultsSummary — row of summary stat cards above the table.
 */

import { Users, Trophy, TrendingUp, CheckCircle2 } from "lucide-react";
import StatCard from "./StatCard";
import { formatScore } from "../utils/helpers";
import { SHORTLIST_THRESHOLD } from "../config";

export default function ResultsSummary({ results }) {
  if (!results || results.length === 0) return null;

  const total = results.length;
  const topScore = Math.max(...results.map((r) => r.final_score));
  const avgScore = results.reduce((a, r) => a + r.final_score, 0) / total;
  const shortlisted = results.filter((r) => r.final_score >= SHORTLIST_THRESHOLD).length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Candidates"
          value={total}
          accent="indigo"
        />
        <StatCard
          icon={Trophy}
          label="Top Score"
          value={formatScore(topScore)}
          accent="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="Average Score"
          value={formatScore(avgScore)}
          accent="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Shortlisted (50+)"
          value={shortlisted}
          accent="violet"
        />
      </div>
    </div>
  );
}
