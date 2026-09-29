/**
 * InputSection — two-column layout with JD textarea (left)
 * and drag-and-drop resume upload (right).
 */

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Sparkles,
  ClipboardPaste,
} from "lucide-react";
import { SAMPLE_JD } from "../data/mockData";

export default function InputSection({
  jobDescription,
  setJobDescription,
  files,
  addFiles,
  removeFile,
  onScreen,
  isLoading,
  error,
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
        /\.(pdf|txt|docx?)$/i.test(f.name)
      );
      if (droppedFiles.length) addFiles(droppedFiles);
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e) => {
      const selected = Array.from(e.target.files);
      if (selected.length) addFiles(selected);
      e.target.value = "";
    },
    [addFiles]
  );

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Screen &amp; Rank Candidates
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Paste your job description and upload resumes to get instant,
          AI-powered candidate rankings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: Job Description ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
          <div className="mb-4 flex items-center justify-between">
            <label
              htmlFor="jd-textarea"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Job Description
            </label>
            <button
              onClick={() => setJobDescription(SAMPLE_JD)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Load sample JD
            </button>
          </div>
          <textarea
            id="jd-textarea"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here, including required and preferred skills sections..."
            className="h-[340px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900"
            aria-label="Job description text"
          />
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            Tip: Include clear &quot;Required Skills&quot; and &quot;Preferred
            Skills&quot; sections for best results.
          </p>
        </div>

        {/* ── Right: Resume Upload ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50">
          <label className="mb-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Resumes ({files.length} uploaded)
          </label>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
              isDragging
                ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/10"
                : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900/50 dark:hover:border-slate-500"
            }`}
            role="button"
            tabIndex={0}
            aria-label="Upload resumes"
            onKeyDown={(e) =>
              e.key === "Enter" && fileInputRef.current?.click()
            }
          >
            <Upload
              className={`mb-3 h-8 w-8 ${isDragging ? "text-indigo-500" : "text-slate-400"}`}
            />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {isDragging
                ? "Drop files here"
                : "Drag & drop resumes, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              PDF, TXT, DOCX — up to 10 files
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
          />

          {/* File list */}
          {files.length > 0 && (
            <ul className="mt-4 max-h-[200px] space-y-2 overflow-y-auto">
              {files.map((file, i) => (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 flex-shrink-0 text-indigo-500" />
                    <span className="truncate text-sm text-slate-700 dark:text-slate-300">
                      {file.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="ml-2 rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mx-auto mt-4 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* CTA button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={onScreen}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-xl hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-900"
          aria-label="Screen candidates"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing resumes…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Screen Candidates
            </>
          )}
        </button>
      </div>
    </section>
  );
}
