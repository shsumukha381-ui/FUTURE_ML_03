"""
Skill gap analysis — identifies what a candidate has vs. what they're missing.

This module provides value beyond simple set-difference:
- Categorises matched skills by taxonomy category (shows breadth).
- Separates missing-required from missing-preferred (shows severity).
- Computes a "gap severity" metric that HR can act on:
  many missing required skills = "High gap", few preferred missing = "Low gap".
"""

from typing import Dict, List, Set

from src.skill_extractor import SkillExtractor


# ──────────────────────────────────────────────
# Gap severity thresholds
# ──────────────────────────────────────────────
def _gap_severity(missing_count: int, total_count: int) -> str:
    """
    Classify how severe the skill gap is.

    Severity is based on the PERCENTAGE of required skills missing,
    not the absolute count — a role requiring 20 skills with 5 missing
    is less severe than one requiring 4 with 3 missing.
    """
    if total_count == 0:
        return "No Gap"
    ratio = missing_count / total_count
    if ratio == 0:
        return "No Gap"
    elif ratio <= 0.25:
        return "Low"
    elif ratio <= 0.50:
        return "Moderate"
    else:
        return "High"


def analyse_skill_gap(
    resume_skills: Set[str],
    required_skills: Set[str],
    preferred_skills: Set[str],
    skill_extractor: SkillExtractor = None,
) -> Dict:
    """
    Produce a detailed skill-gap report for one candidate.

    Args:
        resume_skills: Skills extracted from the candidate's resume.
        required_skills: Skills the JD marks as required/must-have.
        preferred_skills: Skills the JD marks as preferred/nice-to-have.
        skill_extractor: Optional extractor for category lookups.

    Returns:
        Dictionary with matched, missing, gap severity, and category breakdown.
    """
    matched_required = resume_skills & required_skills
    missing_required = required_skills - resume_skills
    matched_preferred = resume_skills & preferred_skills
    missing_preferred = preferred_skills - resume_skills
    # Skills the candidate has that weren't in the JD at all
    bonus_skills = resume_skills - required_skills - preferred_skills

    # ── Category breakdown (if extractor available) ──
    category_breakdown: Dict[str, List[str]] = {}
    if skill_extractor:
        taxonomy = skill_extractor.taxonomy
        for category, skills_list in taxonomy.items():
            skills_lower = {s.lower() for s in skills_list}
            matched_in_cat = resume_skills & skills_lower
            if matched_in_cat:
                category_breakdown[category] = sorted(matched_in_cat)

    return {
        "matched_required": sorted(matched_required),
        "matched_preferred": sorted(matched_preferred),
        "missing_required": sorted(missing_required),
        "missing_preferred": sorted(missing_preferred),
        "bonus_skills": sorted(bonus_skills),
        "required_match_pct": (
            round(len(matched_required) / len(required_skills) * 100, 1)
            if required_skills
            else 0.0
        ),
        "preferred_match_pct": (
            round(len(matched_preferred) / len(preferred_skills) * 100, 1)
            if preferred_skills
            else 0.0
        ),
        "gap_severity": _gap_severity(
            len(missing_required), len(required_skills)
        ),
        "category_breakdown": category_breakdown,
    }


def compare_candidates(
    candidates: List[Dict],
    required_skills: Set[str],
    preferred_skills: Set[str],
    skill_extractor: SkillExtractor = None,
) -> List[Dict]:
    """
    Run skill-gap analysis for a list of scored candidates.

    Each candidate dict must have "resume_skills" (set or list).

    Returns:
        List of gap-analysis dicts, one per candidate.
    """
    reports = []
    for candidate in candidates:
        resume_skills = set(candidate.get("resume_skills", []))
        gap = analyse_skill_gap(
            resume_skills, required_skills, preferred_skills, skill_extractor
        )
        gap["candidate"] = candidate.get("candidate", "Unknown")
        gap["final_score"] = candidate.get("final_score", 0.0)
        reports.append(gap)
    return reports
