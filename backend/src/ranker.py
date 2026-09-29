"""
Candidate ranker — sorts scored candidates and assigns ranks.

Why a separate module instead of just sorted()?
- Ties: candidates with the same score get the same rank (dense ranking).
- Extensibility: this is where you'd add tier labels ("Strong Match",
  "Moderate Match", "Weak Match") or percentile calculations.
- Separation of concerns: scoring computes numbers, ranking interprets them.
"""

from typing import Dict, List


# ──────────────────────────────────────────────
# Tier thresholds (configurable)
# ──────────────────────────────────────────────
TIER_THRESHOLDS = {
    "Strong Match": 70,
    "Moderate Match": 45,
    "Weak Match": 0,
}


def assign_tier(score: float) -> str:
    """
    Map a 0-100 score to a human-readable tier label.

    Thresholds are intentionally conservative:
    - ≥70: candidate matches most requirements
    - 45-69: partial match, worth a closer look
    - <45: significant gaps
    """
    for tier, threshold in TIER_THRESHOLDS.items():
        if score >= threshold:
            return tier
    return "Weak Match"


def rank_candidates(scored_results: List[Dict]) -> List[Dict]:
    """
    Sort candidates by final_score (descending) and assign ranks + tiers.

    Ties receive the same rank (dense ranking). For example, if two
    candidates tie at #1, the next candidate is #3 (standard competition
    ranking used in sports and academic contexts).

    Args:
        scored_results: List of dicts from ResumeScorer.score_batch().

    Returns:
        Same list, sorted, with "rank" and "tier" fields added.
    """
    if not scored_results:
        return []

    # Sort descending by score
    sorted_results = sorted(
        scored_results, key=lambda x: x["final_score"], reverse=True
    )

    # Assign ranks with tie handling (competition ranking: 1, 2, 2, 4)
    current_rank = 1
    for i, result in enumerate(sorted_results):
        if i > 0 and result["final_score"] < sorted_results[i - 1]["final_score"]:
            current_rank = i + 1
        result["rank"] = current_rank
        result["tier"] = assign_tier(result["final_score"])

    return sorted_results


def get_top_candidates(
    ranked_results: List[Dict], top_n: int = 5
) -> List[Dict]:
    """Return the top N candidates from a ranked list."""
    return ranked_results[:top_n]
