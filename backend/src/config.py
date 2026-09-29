"""
Configuration module — single source of truth for all tunable parameters.

Why a dedicated config?
- Recruiters / HR managers may want to adjust scoring weights without
  touching pipeline code.
- Centralising paths and constants prevents magic numbers scattered
  across modules.
"""

from pathlib import Path
from typing import Dict

# ──────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────
PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent
REPO_ROOT: Path = PROJECT_ROOT.parent
DATA_DIR: Path = REPO_ROOT / "sample_data"
SKILLS_TAXONOMY_PATH: Path = PROJECT_ROOT / "skills" / "skills_taxonomy.json"

# ──────────────────────────────────────────────
# Scoring weights (must sum to 1.0)
#
# Rationale for defaults:
#   - Text similarity captures overall domain alignment (40%)
#   - Required-skill match is the hard filter recruiters care about (40%)
#   - Preferred skills are nice-to-haves, so weighted lower (20%)
# ──────────────────────────────────────────────
SCORING_WEIGHTS: Dict[str, float] = {
    "text_similarity": 0.15,
    "required_skills": 0.60,
    "preferred_skills": 0.25,
}

# Guard: weights must sum to 1.0 (with floating-point tolerance)
assert abs(sum(SCORING_WEIGHTS.values()) - 1.0) < 1e-6, (
    f"Scoring weights must sum to 1.0, got {sum(SCORING_WEIGHTS.values())}"
)

# ──────────────────────────────────────────────
# spaCy model
# ──────────────────────────────────────────────
# We use the small English model for speed. Switch to "en_core_web_md"
# or "en_core_web_lg" for better accuracy (at the cost of memory).
SPACY_MODEL: str = "en_core_web_sm"

# ──────────────────────────────────────────────
# TF-IDF settings
# ──────────────────────────────────────────────
TFIDF_MAX_FEATURES: int = 5000       # vocabulary cap to avoid noise
TFIDF_NGRAM_RANGE: tuple = (1, 2)    # unigrams + bigrams capture phrases like "machine learning"

# ──────────────────────────────────────────────
# Preprocessing
# ──────────────────────────────────────────────
MIN_TOKEN_LENGTH: int = 2  # drop single-char tokens (noise after cleaning)
