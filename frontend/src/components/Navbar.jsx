import { useState } from "react";
import { FileText, Moon, Sun, HelpCircle, X, Sparkles, FlaskConical } from "lucide-react";
import { MOCK_MODE } from "../config";

/**
 * Top navigation bar with logo, app title, dark mode toggle,
 * and "How it works" modal trigger.
 */
export default function Navbar({ darkMode, setDarkMode }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-700/50 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <FileText className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                ResumeRank
              </h1>
              <span className="hidden items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 ring-1 ring-inset ring-indigo-500/20 sm:flex dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
                <Sparkles className="h-3 w-3" />
                AI-Powered
              </span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {MOCK_MODE && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20">
                <FlaskConical className="h-3 w-3" />
                Demo Data
              </span>
            )}
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="How scoring works"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">How it works</span>
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* How It Works Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHelp(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
              How Scoring Works
            </h2>

            <div className="space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <div>
                <h3 className="mb-2 text-base font-semibold text-slate-800 dark:text-white">
                  The Formula
                </h3>
                <div className="rounded-xl bg-slate-50 p-4 font-mono text-sm dark:bg-slate-700/50">
                  Final Score = (0.40 × Text Similarity) + (0.40 × Required
                  Skills %) + (0.20 × Preferred Skills %)
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold text-slate-800 dark:text-white">
                  Text Similarity (40%)
                </h3>
                <p>
                  Measures how closely the resume's language matches the job
                  description. Uses a technique called TF-IDF — think of it as
                  checking whether the candidate naturally discusses the same
                  topics as the JD, not just listing keywords.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold text-slate-800 dark:text-white">
                  Required Skills (40%)
                </h3>
                <p>
                  The percentage of must-have skills found in the resume. These
                  are extracted from the "Required Skills" section of your job
                  description. A candidate matching 8 out of 10 required skills
                  scores 80% on this component.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-base font-semibold text-slate-800 dark:text-white">
                  Preferred Skills (20%)
                </h3>
                <p>
                  Nice-to-have skills carry lower weight because they
                  differentiate equally qualified candidates rather than serve as
                  deal-breakers.
                </p>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                <h3 className="mb-2 text-base font-semibold text-indigo-800 dark:text-indigo-300">
                  Score Tiers
                </h3>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <strong>75+</strong> — Strong Match
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <strong>50–74</strong> — Moderate Match
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <strong>Below 50</strong> — Weak Match
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
