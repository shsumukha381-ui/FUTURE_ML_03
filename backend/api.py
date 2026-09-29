"""
FastAPI wrapper exposing the resume screening pipeline as a REST API.

Endpoints:
    POST /rank       — Score and rank uploaded resume files against a JD.
    POST /rank/json  — Score and rank resumes sent as JSON (original format).
    POST /rank/sample— Demo endpoint using built-in sample data.
    GET  /health     — Liveness check.

Usage:
    uvicorn api:app --reload --port 8000
"""

import io
import json
import re
import logging
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.config import DATA_DIR
from src.skill_extractor import SkillExtractor
from src.jd_parser import JDParser
from src.scorer import ResumeScorer
from src.ranker import rank_candidates
from src.explain import explain_candidate, explain_score_breakdown

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# File reading helpers
# ──────────────────────────────────────────────

def read_txt(content: bytes) -> str:
    """Read plain text, tolerating encoding errors."""
    return content.decode("utf-8", errors="ignore")


def read_pdf_bytes(content: bytes) -> str:
    """Extract text from in-memory PDF bytes using pdfplumber."""
    import pdfplumber
    text_parts = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def read_docx_bytes(content: bytes) -> str:
    """Extract text from in-memory .docx bytes using python-docx."""
    import docx
    doc = docx.Document(io.BytesIO(content))
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())


def filename_to_candidate_name(filename: str) -> str:
    """
    Convert a filename like '07_vikram_singh_weak_accountant.txt'
    into a readable name like 'Vikram Singh'.

    Strategy: strip extension, split on underscores, drop leading numbers
    and trailing descriptors (weak/strong/medium/good + role words).
    """
    stem = Path(filename).stem  # remove extension
    parts = stem.split("_")

    # Drop leading numeric index (e.g., "07")
    if parts and parts[0].isdigit():
        parts = parts[1:]

    # Drop trailing descriptor words (weak, strong, medium, good, + common roles)
    stop_words = {
        "weak", "strong", "medium", "good", "great", "poor",
        "data", "scientist", "engineer", "developer", "analyst",
        "accountant", "designer", "graphic", "recruiter", "devops",
        "web", "ml", "nlp", "junior", "senior", "hr", "cloud",
        "full", "stack", "frontend", "backend",
    }
    # Keep name parts (typically 2-3 words before descriptors)
    name_parts = []
    for p in parts:
        if p.lower() in stop_words:
            break
        name_parts.append(p)

    if not name_parts:
        # Fallback: use the full stem if no name parts found
        name_parts = parts[:2] if len(parts) >= 2 else parts

    return " ".join(w.capitalize() for w in name_parts)


async def parse_uploaded_file(file: UploadFile) -> Optional[Dict[str, str]]:
    """
    Read an uploaded file and return {name, text}.
    Returns None for empty or unreadable files (skipped with warning).
    """
    try:
        content = await file.read()
        if not content or len(content.strip()) == 0:
            logger.warning(f"Skipping empty file: {file.filename}")
            return None

        ext = Path(file.filename).suffix.lower()

        if ext == ".pdf":
            text = read_pdf_bytes(content)
        elif ext in (".doc", ".docx"):
            text = read_docx_bytes(content)
        else:
            # Default: treat as plain text (.txt or unknown)
            text = read_txt(content)

        if not text or not text.strip():
            logger.warning(f"No text extracted from: {file.filename}")
            return None

        name = filename_to_candidate_name(file.filename)
        logger.info(f"Parsed resume: {file.filename} → '{name}' ({len(text)} chars)")
        return {"name": name, "text": text}

    except Exception as e:
        logger.warning(f"Failed to read {file.filename}: {e}")
        return None


# ──────────────────────────────────────────────
# Pydantic models
# ──────────────────────────────────────────────

class ScoreBreakdown(BaseModel):
    text_similarity: float
    required_skills_score: float
    preferred_skills_score: float


class CandidateResult(BaseModel):
    candidate: str
    rank: int
    tier: str
    final_score: float
    score_breakdown: ScoreBreakdown
    matched_skills: List[str]
    missing_required_skills: List[str]
    missing_preferred_skills: List[str]
    explanation: str


# ──────────────────────────────────────────────
# App initialisation
# ──────────────────────────────────────────────
app = FastAPI(
    title="Resume Screening & Ranking API",
    description=(
        "Automatically screen, score, and rank resumes against a job "
        "description with transparent, explainable results."
    ),
    version="1.0.0",
)

# CORS — allow the React frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise shared pipeline components once (expensive to reload)
_extractor = SkillExtractor()
_jd_parser = JDParser(skill_extractor=_extractor)
_scorer = ResumeScorer(skill_extractor=_extractor)
logger.info("Pipeline initialised: extractor, parser, scorer ready.")

# Check sample data availability
if DATA_DIR.exists():
    _sample_resumes = list((DATA_DIR / "resumes").glob("*.txt"))
    logger.info(f"Dataset folder found at {DATA_DIR}. Loaded {_extractor.all_known_skills.__len__()} known skills and {_sample_resumes.__len__()} sample resumes for demo.")
else:
    logger.warning(f"Dataset folder NOT found at {DATA_DIR}.")


@app.get("/health")
def health_check():
    """Liveness probe."""
    return {"status": "healthy", "version": "1.0.0"}


@app.post("/rank")
async def rank_resumes_upload(
    job_description: str = Form(...),
    resumes: List[UploadFile] = File(...),
):
    """
    PRIMARY ENDPOINT — accepts multipart form data.
    Frontend sends: FormData with 'job_description' (text) + 'resumes' (files).
    """
    try:
        # 1. Parse the job description
        parsed_jd = _jd_parser.parse(job_description)
        logger.info(
            f"JD parsed: {len(parsed_jd.required_skills)} required, "
            f"{len(parsed_jd.preferred_skills)} preferred skills"
        )

        # 2. Read all uploaded files (skip failures gracefully)
        resume_dicts = []
        for file in resumes:
            parsed = await parse_uploaded_file(file)
            if parsed:
                resume_dicts.append(parsed)

        if not resume_dicts:
            raise HTTPException(
                status_code=400,
                detail="No valid resumes could be read. Check file formats (PDF/TXT/DOCX).",
            )

        logger.info(f"Scoring {len(resume_dicts)} resumes...")

        # 3. Score all resumes
        scored = _scorer.score_batch(resume_dicts, parsed_jd)

        # 4. Rank candidates
        ranked = rank_candidates(scored)

        # 5. Build response
        results = []
        for r in ranked:
            results.append(
                CandidateResult(
                    candidate=r["candidate"],
                    rank=r["rank"],
                    tier=r["tier"],
                    final_score=r["final_score"],
                    score_breakdown=ScoreBreakdown(**r["score_breakdown"]),
                    matched_skills=r["matched_skills"],
                    missing_required_skills=r["missing_required_skills"],
                    missing_preferred_skills=r["missing_preferred_skills"],
                    explanation=explain_candidate(r),
                ).model_dump()
            )

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ranking failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rank/sample")
def rank_sample_resumes():
    """Demo endpoint using built-in sample data."""
    resumes_path = DATA_DIR / "sample_resumes.json"
    jds_path = DATA_DIR / "sample_jds.json"

    if not resumes_path.exists() or not jds_path.exists():
        raise HTTPException(status_code=404, detail="Sample data not found.")

    with open(resumes_path, "r", encoding="utf-8") as f:
        resumes = json.load(f)
    with open(jds_path, "r", encoding="utf-8") as f:
        jds = json.load(f)

    jd = jds[0]
    parsed_jd = _jd_parser.parse(jd["text"], jd.get("title", ""))
    scored = _scorer.score_batch(resumes, parsed_jd)
    ranked = rank_candidates(scored)

    results = []
    for r in ranked:
        results.append({
            **r,
            "explanation": explain_candidate(r),
        })

    return {
        "job_title": jd.get("title", "Sample JD"),
        "total_candidates": len(results),
        "results": results,
    }
