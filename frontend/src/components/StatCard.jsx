/**
 * StatCard — a summary metric card (total candidates, top score, etc.)
 * with an icon and subtle gradient accent.
 */

export default function StatCard({ icon: Icon, label, value, accent = "indigo" }) {
  const accents = {
    indigo: "from-indigo-500 to-violet-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400",
    emerald: "from-emerald-500 to-teal-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber: "from-amber-500 to-orange-500 text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400",
    violet: "from-violet-500 to-purple-500 text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400",
  };

  const colors = accents[accent] || accents.indigo;
  const [gradientFrom] = colors.split(" ");

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/50">
      {/* Subtle gradient accent bar */}
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${colors.split(" ").slice(0, 2).join(" ")}`}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <div
          className={`rounded-xl p-2.5 ${colors.split(" ").slice(2).join(" ")}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
