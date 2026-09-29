/**
 * Application configuration.
 *
 * MOCK_MODE = false → calls the real backend API.
 * Set to true ONLY for UI development without a backend.
 */

// ⚠️  Set to false to use the real backend, true for hardcoded demo data
export const MOCK_MODE = false;

// Backend API URL — override with a .env file: VITE_API_URL=http://localhost:8000
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

// Scoring weight labels (must match backend config.py)
export const SCORING_WEIGHTS = {
  text_similarity: { label: "Text Similarity", weight: 0.4 },
  required_skills: { label: "Required Skills", weight: 0.4 },
  preferred_skills: { label: "Preferred Skills", weight: 0.2 },
};

// Score color thresholds
export const SCORE_COLORS = {
  high: { min: 75, color: "#22c55e", bg: "#f0fdf4", label: "Strong Match" },
  medium: { min: 50, color: "#f59e0b", bg: "#fffbeb", label: "Moderate Match" },
  low: { min: 0, color: "#ef4444", bg: "#fef2f2", label: "Weak Match" },
};

// Shortlist threshold — candidates scoring at or above this are "shortlisted"
export const SHORTLIST_THRESHOLD = 50;
