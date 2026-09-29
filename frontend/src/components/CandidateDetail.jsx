/**
 * CandidateDetail — slide-over drawer showing full score breakdown,
 * skill chips, and plain-English explanation for one candidate.
 */

import { X, MessageSquareText } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import SkillChip from "./SkillChip";
import { formatScore, getScoreColorClass, getTierLabel, getScoreBadgeClass } from "../utils/helpers";

export default function CandidateDetail({ candidate, onClose }) {
  if (!candidate) return null;

  const breakdownData = [
    {
      name: "Text Similarity",
      value: candidate.score_breakdown.text_similarity,
      fill: "#6366f1",
    },
    {
      name: "Required Skills",
      value: candidate.score_breakdown.required_skills_score,
      fill: "#22c55e",
    },
    {
      name: "Preferred Skills",
      value: candidate.score_breakdown.preferred_skills_score,
      fill: "#f59e0b",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative h-full w-full max-w-xl animate-slide-in overflow-y-auto bg-white shadow-2xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/95">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {candidate.candidate}
            </h3>
            <div className="mt-1 flex items-center gap-3">
              <span
                className={`text-2xl font-bold ${getScoreColorClass(candidate.final_score)}`}
              >
                {formatScore(candidate.final_score)}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${getScoreBadgeClass(candidate.final_score)}`}
              >
                {getTierLabel(candidate.final_score)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
            aria-label="Close detail panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Score breakdown chart */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Score Breakdown
            </h4>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={breakdownData}
                  layout="vertical"
                  margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val) => [`${val.toFixed(1)}%`, "Score"]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                    {breakdownData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Weight labels */}
            <div className="mt-3 flex justify-between text-xs text-slate-400">
              <span>Text Similarity: 40% weight</span>
              <span>Required: 40% weight</span>
              <span>Preferred: 20% weight</span>
            </div>
          </div>

          {/* Matched skills */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Matched Skills ({candidate.matched_skills.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {candidate.matched_skills.map((s) => (
                <SkillChip key={s} skill={s} variant="matched" />
              ))}
              {candidate.matched_skills.length === 0 && (
                <p className="text-sm text-slate-400">
                  No matching skills identified
                </p>
              )}
            </div>
          </div>

          {/* Missing required */}
          {candidate.missing_required_skills.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-red-600 dark:text-red-400">
                Missing Required Skills (
                {candidate.missing_required_skills.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {candidate.missing_required_skills.map((s) => (
                  <SkillChip key={s} skill={s} variant="missing-required" />
                ))}
              </div>
            </div>
          )}

          {/* Missing preferred */}
          {candidate.missing_preferred_skills.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-amber-600 dark:text-amber-400">
                Missing Preferred Skills (
                {candidate.missing_preferred_skills.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {candidate.missing_preferred_skills.map((s) => (
                  <SkillChip key={s} skill={s} variant="missing-preferred" />
                ))}
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              <MessageSquareText className="h-4 w-4" />
              AI Assessment
            </div>
            <p className="text-sm leading-relaxed text-indigo-800 dark:text-indigo-200">
              {candidate.explanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
