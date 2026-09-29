/**
 * CandidateTable — ranked results with sortable columns,
 * a minimum-score slider, and compare-candidate checkboxes.
 */

import { useState, useMemo } from "react";
import {
  Eye,
  ArrowUpDown,
  Download,
  GitCompareArrows,
  SlidersHorizontal,
} from "lucide-react";
import ScoreBar from "./ScoreBar";
import {
  getScoreBadgeClass,
  getTierLabel,
  formatScore,
  resultsToCSV,
  downloadFile,
} from "../utils/helpers";

export default function CandidateTable({
  results,
  onViewDetail,
  onCompare,
  selectedForCompare,
  toggleCompare,
}) {
  const [sortField, setSortField] = useState("final_score");
  const [sortDir, setSortDir] = useState("desc");
  const [minScore, setMinScore] = useState(0);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let data = results.filter((r) => r.final_score >= minScore);
    data.sort((a, b) => {
      const aVal = typeof a[sortField] === "string" ? a[sortField] : a[sortField];
      const bVal = typeof b[sortField] === "string" ? b[sortField] : b[sortField];
      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return data;
  }, [results, sortField, sortDir, minScore]);

  const handleExport = () => {
    const csv = resultsToCSV(filtered);
    downloadFile(csv, "candidate_rankings.csv");
  };

  const SortButton = ({ field, children }) => (
    <button
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      aria-label={`Sort by ${field}`}
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
        {/* Header bar */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Ranked Candidates
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {/* Min score slider */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Min:
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-600"
                aria-label="Minimum score filter"
              />
              <span className="min-w-[2rem] text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
                {minScore}
              </span>
            </div>

            {/* Compare button */}
            {selectedForCompare.length >= 2 && (
              <button
                onClick={onCompare}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 ring-1 ring-inset ring-indigo-200 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20"
              >
                <GitCompareArrows className="h-3.5 w-3.5" />
                Compare ({selectedForCompare.length})
              </button>
            )}

            {/* Export */}
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/50">
                <th className="px-5 py-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Cmp
                  </span>
                </th>
                <th className="px-5 py-3 text-left">
                  <SortButton field="final_score">Rank</SortButton>
                </th>
                <th className="px-5 py-3 text-left">
                  <SortButton field="candidate">Candidate</SortButton>
                </th>
                <th className="w-48 px-5 py-3 text-left">
                  <SortButton field="final_score">Score</SortButton>
                </th>
                <th className="hidden px-5 py-3 text-left md:table-cell">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Top Skills
                  </span>
                </th>
                <th className="hidden px-5 py-3 text-center sm:table-cell">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Gaps
                  </span>
                </th>
                <th className="px-5 py-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Action
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {filtered.map((r, i) => {
                const isSelected = selectedForCompare.includes(r.candidate);
                return (
                  <tr
                    key={r.candidate}
                    className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30"
                  >
                    {/* Compare checkbox */}
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCompare(r.candidate)}
                        disabled={
                          !isSelected && selectedForCompare.length >= 3
                        }
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                        aria-label={`Select ${r.candidate} for comparison`}
                      />
                    </td>

                    {/* Rank */}
                    <td className="px-5 py-4">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {i + 1}
                      </span>
                    </td>

                    {/* Name + tier */}
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {r.candidate}
                        </span>
                        <span
                          className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getScoreBadgeClass(r.final_score)}`}
                        >
                          {getTierLabel(r.final_score)}
                        </span>
                      </div>
                    </td>

                    {/* Score bar */}
                    <td className="px-5 py-4">
                      <ScoreBar score={r.final_score} />
                    </td>

                    {/* Top skills */}
                    <td className="hidden px-5 py-4 md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {r.matched_skills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          >
                            {s}
                          </span>
                        ))}
                        {r.matched_skills.length > 3 && (
                          <span className="text-xs text-slate-400">
                            +{r.matched_skills.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Missing count */}
                    <td className="hidden px-5 py-4 text-center sm:table-cell">
                      {r.missing_required_skills.length > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                          {r.missing_required_skills.length} req
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-500">
                          ✓ All met
                        </span>
                      )}
                    </td>

                    {/* Detail button */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onViewDetail(r)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center text-sm text-slate-400">
            No candidates match the current filter. Try lowering the minimum
            score.
          </div>
        )}
      </div>
    </div>
  );
}
