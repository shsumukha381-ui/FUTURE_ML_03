/**
 * SkillChip — a small pill showing a skill name.
 * Variants: matched (green), missing-required (red), missing-preferred (amber).
 */

import { Check, X, AlertTriangle } from "lucide-react";

const VARIANTS = {
  matched: {
    classes:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    icon: Check,
  },
  "missing-required": {
    classes:
      "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    icon: X,
  },
  "missing-preferred": {
    classes:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
    icon: AlertTriangle,
  },
};

export default function SkillChip({ skill, variant = "matched" }) {
  const config = VARIANTS[variant] || VARIANTS.matched;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${config.classes}`}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      {skill}
    </span>
  );
}
