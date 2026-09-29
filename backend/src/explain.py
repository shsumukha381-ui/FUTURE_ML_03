"""
Plain-English explanation generator for non-technical stakeholders.

Design philosophy:
- Every score must be EXPLAINABLE. An HR manager should understand
  WHY a candidate ranked #1 without knowing what "cosine similarity" means.
- Explanations follow a consistent template:
  1. Overall assessment (one sentence)
  2. Strength highlights
  3. Gap callouts
- Language is professional but accessible — no jargon, no math.
"""

from typing import Dict, List


def explain_candidate(result: Dict) -> str:
    """
    Generate a 2-3 sentence plain-English explanation for one candidate's score.

    Args:
        result: A scored+ranked candidate dict with keys:
                final_score, score_breakdown, matched_skills,
                missing_required_skills, missing_preferred_skills,
                tier, rank (optional).

    Returns:
        Human-readable explanation string.
    """
    score = result.get("final_score", 0)
    tier = result.get("tier", "Unranked")
    matched = result.get("matched_skills", [])
    missing_req = result.get("missing_required_skills", [])
    missing_pref = result.get("missing_preferred_skills", [])
    breakdown = result.get("score_breakdown", {})

    # ── Sentence 1: Overall verdict ──
    if score >= 70:
        opener = (
            f"This candidate is a {tier.lower()} with a score of {score}/100, "
            f"showing strong alignment with the role requirements."
        )
    elif score >= 45:
        opener = (
            f"This candidate is a {tier.lower()} scoring {score}/100, "
            f"showing partial alignment with some notable gaps."
        )
    else:
        opener = (
            f"This candidate scored {score}/100, indicating "
            f"significant gaps relative to the role requirements."
        )

    # ── Sentence 2: Strengths ──
    if matched:
        top_skills = matched[:5]  # Show at most 5 to keep it concise
        skills_str = ", ".join(top_skills)
        extras = f" (and {len(matched) - 5} more)" if len(matched) > 5 else ""
        strength = f"Key matching skills include {skills_str}{extras}."
    else:
        strength = "No matching skills were identified from the job requirements."

    # ── Sentence 3: Gaps ──
    if missing_req:
        top_missing = missing_req[:4]
        missing_str = ", ".join(top_missing)
        extras = f" and {len(missing_req) - 4} others" if len(missing_req) > 4 else ""
        gap = f"Missing required skills: {missing_str}{extras}."
    elif missing_pref:
        gap = (
            f"All required skills are covered. "
            f"{len(missing_pref)} preferred skill(s) are missing."
        )
    else:
        gap = "The candidate covers all required and preferred skills."

    return f"{opener} {strength} {gap}"


def explain_ranking(ranked_results: List[Dict]) -> str:
    """
    Generate a summary explanation of the full ranking.

    Useful for a dashboard overview or email digest.
    """
    if not ranked_results:
        return "No candidates were evaluated."

    total = len(ranked_results)
    top = ranked_results[0]
    avg_score = sum(r["final_score"] for r in ranked_results) / total

    lines = [
        f"## Ranking Summary",
        f"",
        f"**{total} candidates** evaluated. Average score: **{avg_score:.1f}/100**.",
        f"",
        f"**Top candidate**: {top.get('candidate', 'Unknown')} "
        f"(Score: {top['final_score']}/100, Tier: {top.get('tier', 'N/A')})",
        f"",
    ]

    # Tier distribution
    tier_counts: Dict[str, int] = {}
    for r in ranked_results:
        t = r.get("tier", "Unranked")
        tier_counts[t] = tier_counts.get(t, 0) + 1

    lines.append("**Tier distribution:**")
    for tier, count in tier_counts.items():
        lines.append(f"- {tier}: {count} candidate(s)")

    return "\n".join(lines)


def explain_score_breakdown(result: Dict) -> str:
    """
    Explain HOW the score was calculated in non-technical language.

    This is the transparency feature — shows the user exactly which
    components contributed to the final number.
    """
    breakdown = result.get("score_breakdown", {})
    sim = breakdown.get("text_similarity", 0)
    req = breakdown.get("required_skills_score", 0)
    pref = breakdown.get("preferred_skills_score", 0)

    return (
        f"Score breakdown for {result.get('candidate', 'this candidate')}:\n"
        f"  • Resume-to-job text similarity: {sim:.1f}% "
        f"(how closely the resume language matches the job description)\n"
        f"  • Required skills coverage: {req:.1f}% "
        f"(percentage of must-have skills found in the resume)\n"
        f"  • Preferred skills coverage: {pref:.1f}% "
        f"(percentage of nice-to-have skills found in the resume)\n"
        f"  • Final weighted score: {result.get('final_score', 0):.1f}/100"
    )
