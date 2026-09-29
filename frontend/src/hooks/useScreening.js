import { useState, useCallback } from "react";
import { rankResumes } from "../utils/api";

/**
 * Custom hook encapsulating the screening pipeline state.
 * Manages JD text, uploaded files, results, loading, and errors.
 */
export function useScreening() {
  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const addFiles = useCallback((newFiles) => {
    setFiles((prev) => {
      // Deduplicate by name+size
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const unique = newFiles.filter(
        (f) => !existing.has(`${f.name}-${f.size}`)
      );
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setResults(null);
    setError(null);
    setJobDescription("");
  }, []);

  const screen = useCallback(async () => {
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one resume.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await rankResumes(jobDescription, files);
      // Sort by score descending
      const sorted = [...data].sort((a, b) => b.final_score - a.final_score);
      setResults(sorted);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [jobDescription, files]);

  return {
    jobDescription,
    setJobDescription,
    files,
    addFiles,
    removeFile,
    clearAll,
    results,
    setResults,
    isLoading,
    error,
    setError,
    screen,
  };
}
