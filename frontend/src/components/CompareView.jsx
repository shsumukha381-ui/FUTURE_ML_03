/**
 * CompareView — side-by-side comparison of 2-3 candidates
 * with a Recharts radar chart and skill matrix.
 */

import { X, Radar } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { formatScore, getScoreBadgeClass, getTierLabel } from "../utils/helpers";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b"];

export default function CompareView({ candidates, onClose }) {
  if (!candidates || candidates.length < 2) return null;

  // Build radar data from score breakdowns
  const radarData = [
    {
      metric: "Text Similarity",
      ...Object.fromEntries(
        candidates.map((c) => [c.candidate, c.score_breakdown.text_similarity])
      ),
    },
    {
      metric: "Required Skills",
      ...Object.fromEntries(
        candidates.map((c) => [
          c.candidate,
          c.score_breakdown.required_skills_score,
        ])
      ),
    },
    {
      metric: "Preferred Skills",
      ...Object.fromEntries(
        candidates.map((c) => [
          c.candidate,
          c.score_breakdown.preferred_skills_score,
        ])
      ),
    },
  ];

  // Collect all unique skills across all candidates
  const allSkills = new Set();
  candidates.forEach((c) => {
    c.matched_skills.forEach((s) => allSkills.add(s));
    c.missing_required_skills.forEach((s) => allSkills.add(s));
    c.missing_preferred_skills.forEach((s) => allSkills.add(s));
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          aria-label="Close comparison"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-2">
          <Radar className="h-5 w-5 text-indigo-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Candidate Comparison
          </h2>
        </div>

        {/* Score overview cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {candidates.map((c, i) => (
            <div
              key={c.candidate}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              style={{ borderTopColor: COLORS[i], borderTopWidth: "3px" }}
            >
              <p className="font-semibold text-slate-900 dark:text-white">
                {c.candidate}
              </p>
              <p className="mt-1 text-2xl font-bold" style={{ color: COLORS[i] }}>
                {formatScore(c.final_score)}
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getScoreBadgeClass(c.final_score)}`}
              >
                {getTierLabel(c.final_score)}
              </span>
            </div>
          ))}
        </div>

        {/* Radar chart */}
        <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 12, fill: "#64748b" }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "13px",
                }}
              />
              <Legend />
              {candidates.map((c, i) => (
                <RechartsRadar
                  key={c.candidate}
                  name={c.candidate}
                  dataKey={c.candidate}
                  stroke={COLORS[i]}
                  fill={COLORS[i]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Skill matrix */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Skill Matrix
          </h3>
          <div className="max-h-[300px] overflow-auto rounded-xl border border-slate-100 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
                  <th className="sticky left-0 bg-slate-50 px-3 py-2.5 text-left font-semibold text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                    Skill
                  </th>
                  {candidates.map((c, i) => (
                    <th
                      key={c.candidate}
                      className="px-3 py-2.5 text-center font-semibold"
                      style={{ color: COLORS[i] }}
                    >
                      {c.candidate}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                {[...allSkills].sort().map((skill) => (
                  <tr
                    key={skill}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="sticky left-0 bg-white px-3 py-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {skill}
                    </td>
                    {candidates.map((c) => {
                      const hasSkill = c.matched_skills.includes(skill);
                      const isMissingReq =
                        c.missing_required_skills.includes(skill);
                      return (
                        <td key={c.candidate} className="px-3 py-2 text-center">
                          {hasSkill ? (
                            <span className="text-emerald-500">✓</span>
                          ) : isMissingReq ? (
                            <span className="text-red-500">✗</span>
                          ) : (
                            <span className="text-amber-400">–</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
