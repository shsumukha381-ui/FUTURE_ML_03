/**
 * App.jsx — root component composing the full dashboard.
 *
 * Layout flow:
 *   Navbar → InputSection → (Loading | Results) → Detail Drawer → Compare Modal
 *
 * State management:
 *   useScreening hook owns all pipeline state (JD, files, results, loading).
 *   Local state handles UI concerns (dark mode, selected candidate, compare list).
 */

import { useState, useEffect, useCallback } from "react";
import Navbar from "./components/Navbar";
import InputSection from "./components/InputSection";
import ResultsSummary from "./components/ResultsSummary";
import CandidateTable from "./components/CandidateTable";
import CandidateDetail from "./components/CandidateDetail";
import CompareView from "./components/CompareView";
import LoadingSkeleton from "./components/LoadingSkeleton";
import { useScreening } from "./hooks/useScreening";

export default function App() {
  // ── Dark mode with localStorage persistence ──
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("resumerank-dark-mode");
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("resumerank-dark-mode", JSON.stringify(darkMode));
  }, [darkMode]);

  // ── Pipeline state ──
  const {
    jobDescription,
    setJobDescription,
    files,
    addFiles,
    removeFile,
    results,
    isLoading,
    error,
    setError,
    screen,
  } = useScreening();

  // ── UI state ──
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [compareNames, setCompareNames] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const toggleCompare = useCallback((name) => {
    setCompareNames((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : prev.length < 3
          ? [...prev, name]
          : prev
    );
  }, []);

  const compareCandidates = results
    ? results.filter((r) => compareNames.includes(r.candidate))
    : [];

  // Close detail drawer on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setSelectedCandidate(null);
        setShowCompare(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-900">
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />

      <main>
        {/* Input section — always visible */}
        <InputSection
          jobDescription={jobDescription}
          setJobDescription={setJobDescription}
          files={files}
          addFiles={addFiles}
          removeFile={removeFile}
          onScreen={screen}
          isLoading={isLoading}
          error={error}
        />

        {/* Loading skeleton */}
        {isLoading && <LoadingSkeleton />}

        {/* Results */}
        {results && !isLoading && (
          <div className="animate-fade-in-up space-y-6 pb-12">
            {/* Divider */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  Results
                </span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>
            </div>

            <ResultsSummary results={results} />

            <CandidateTable
              results={results}
              onViewDetail={setSelectedCandidate}
              onCompare={() => setShowCompare(true)}
              selectedForCompare={compareNames}
              toggleCompare={toggleCompare}
            />
          </div>
        )}

        {/* Empty state — no results yet, not loading */}
        {!results && !isLoading && (
          <div className="mx-auto max-w-md px-4 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              Ready to screen
            </h3>
            <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
              Paste a job description and upload resumes to get started. Results
              will appear here with scores, skill gaps, and explanations.
            </p>
          </div>
        )}
      </main>

      {/* Detail drawer */}
      {selectedCandidate && (
        <CandidateDetail
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {/* Compare modal */}
      {showCompare && compareCandidates.length >= 2 && (
        <CompareView
          candidates={compareCandidates}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
