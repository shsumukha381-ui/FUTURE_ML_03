/**
 * Utility functions for scoring, formatting, and color logic.
 */

import { SCORE_COLORS } from "../config";

/**
 * Get the color config for a given score.
 * 75+ = green (strong), 50-74 = amber (moderate), <50 = red (weak)
 */
export function getScoreColor(score) {
  if (score >= SCORE_COLORS.high.min) return SCORE_COLORS.high;
  if (score >= SCORE_COLORS.medium.min) return SCORE_COLORS.medium;
  return SCORE_COLORS.low;
}

/**
 * Get a Tailwind-friendly color class for a score tier.
 */
export function getScoreColorClass(score) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

export function getScoreBgClass(score) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function getScoreBadgeClass(score) {
  if (score >= 75)
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20";
  if (score >= 50)
    return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20";
  return "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20";
}

export function getTierLabel(score) {
  if (score >= 75) return "Strong Match";
  if (score >= 50) return "Moderate Match";
  return "Weak Match";
}

/**
 * Format a score to one decimal place.
 */
export function formatScore(score) {
  return Number(score).toFixed(1);
}

/**
 * Convert results array to CSV string for export.
 */
export function resultsToCSV(results) {
  const headers = [
    "Rank",
    "Candidate",
    "Score",
    "Tier",
    "Text Similarity",
    "Required Skills Score",
    "Preferred Skills Score",
    "Matched Skills",
    "Missing Required",
    "Missing Preferred",
    "Explanation",
  ];

  const rows = results.map((r, i) => [
    i + 1,
    r.candidate,
    r.final_score,
    getTierLabel(r.final_score),
    r.score_breakdown.text_similarity,
    r.score_breakdown.required_skills_score,
    r.score_breakdown.preferred_skills_score,
    `"${r.matched_skills.join(", ")}"`,
    `"${r.missing_required_skills.join(", ")}"`,
    `"${r.missing_preferred_skills.join(", ")}"`,
    `"${r.explanation.replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Trigger a browser file download.
 */
export function downloadFile(content, filename, mimeType = "text/csv") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
