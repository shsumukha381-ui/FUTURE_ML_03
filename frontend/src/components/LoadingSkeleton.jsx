/**
 * LoadingSkeleton — pulsing placeholder UI shown while the API responds.
 * Mirrors the shape of ResultsSummary + CandidateTable for smooth transition.
 */

export default function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50"
          >
            <div className="mb-3 h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-8 w-16 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
        <div className="mb-6 h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-12 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
