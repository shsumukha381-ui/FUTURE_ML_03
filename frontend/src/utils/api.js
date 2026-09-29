/**
 * API service — handles communication with the FastAPI backend.
 *
 * In MOCK_MODE: returns hardcoded data (for UI dev without backend).
 * Otherwise: sends FormData to POST /rank and surfaces all errors clearly.
 *
 * IMPORTANT: Do NOT set Content-Type header manually for FormData —
 * the browser must set the multipart boundary automatically.
 */

import { MOCK_MODE, API_BASE_URL } from "../config";
import { MOCK_RESULTS } from "../data/mockData";

/**
 * Send resumes and a JD to the backend for ranking.
 *
 * @param {string} jobDescription - The job description text
 * @param {File[]} resumeFiles - Array of uploaded resume files
 * @returns {Promise<Array>} Ranked candidate results
 */
export async function rankResumes(jobDescription, resumeFiles) {
  // ── Mock mode: return fake data, clearly labelled ──
  if (MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return MOCK_RESULTS;
  }

  // ── Real mode: call backend ──
  const formData = new FormData();
  formData.append("job_description", jobDescription);

  // Each file appended with the same key "resumes" — FastAPI reads List[UploadFile]
  resumeFiles.forEach((file) => {
    formData.append("resumes", file);
  });

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/rank`, {
      method: "POST",
      body: formData,
      // Do NOT set Content-Type — browser adds multipart boundary automatically
    });
  } catch (networkError) {
    // Network errors (backend not running, CORS blocked, DNS failure)
    throw new Error(
      `Cannot reach the backend at ${API_BASE_URL}. ` +
      `Is the FastAPI server running? (uvicorn api:app --reload --port 8000)`
    );
  }

  // ── Handle HTTP error responses ──
  if (!response.ok) {
    let detail = `Server error: ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      // Response wasn't JSON — use status text
      detail = `${response.status} ${response.statusText}`;
    }

    if (response.status === 422) {
      throw new Error(`Validation error: ${detail}. Check that the JD and resume files are valid.`);
    }
    throw new Error(detail);
  }

  // ── Parse successful response ──
  const data = await response.json();

  // Backend returns a flat list (not wrapped in {results: [...]})
  const results = Array.isArray(data) ? data : data.results || [];

  if (results.length === 0) {
    throw new Error("The backend returned no results. Check that the uploaded files contain readable text.");
  }

  return results;
}
