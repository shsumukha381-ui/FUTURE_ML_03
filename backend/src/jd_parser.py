"""
Job Description parser — extracts structured requirements from free text.

Parsing strategy:
- We look for section headers like "Required Skills", "Must Have",
  "Preferred", "Nice to Have" to segment the JD.
- Within each section, we run the SkillExtractor to pull known skills.
- Experience level is detected via regex patterns ("3+ years", "senior", etc.).
- If no sections are found, ALL extracted skills default to "required"
  (conservative assumption — better to over-require than miss).
"""

import re
from dataclasses import dataclass, field
from typing import List, Set

from src.skill_extractor import SkillExtractor


# ──────────────────────────────────────────────
# Section header patterns
# ──────────────────────────────────────────────
_REQUIRED_HEADERS = re.compile(
    r"(required\s*skills?|must\s*have|requirements?|qualifications?|"
    r"what\s*you\s*(?:need|bring)|essential)",
    re.IGNORECASE,
)

_PREFERRED_HEADERS = re.compile(
    r"(preferred\s*skills?|nice\s*to\s*have|bonus|desired|good\s*to\s*have|"
    r"additional\s*skills?|plus|advantageous)",
    re.IGNORECASE,
)

# ──────────────────────────────────────────────
# Experience patterns
# ──────────────────────────────────────────────
_EXPERIENCE_PATTERN = re.compile(
    r"(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)?",
    re.IGNORECASE,
)

_SENIORITY_MAP = {
    "intern": "intern",
    "entry level": "entry",
    "entry-level": "entry",
    "junior": "junior",
    "mid level": "mid",
    "mid-level": "mid",
    "senior": "senior",
    "lead": "lead",
    "principal": "principal",
    "staff": "staff",
    "architect": "senior",
    "manager": "senior",
    "director": "lead",
}


@dataclass
class ParsedJobDescription:
    """Structured representation of a parsed job description."""

    title: str = ""
    raw_text: str = ""
    required_skills: Set[str] = field(default_factory=set)
    preferred_skills: Set[str] = field(default_factory=set)
    all_skills: Set[str] = field(default_factory=set)
    experience_years: int = 0
    seniority_level: str = "not specified"
    keywords: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Serialise for JSON/API output."""
        return {
            "title": self.title,
            "required_skills": sorted(self.required_skills),
            "preferred_skills": sorted(self.preferred_skills),
            "all_skills": sorted(self.all_skills),
            "experience_years": self.experience_years,
            "seniority_level": self.seniority_level,
            "keywords": self.keywords,
        }


class JDParser:
    """
    Parses a free-text job description into structured requirements.
    """

    def __init__(self, skill_extractor: SkillExtractor = None):
        self._extractor = skill_extractor or SkillExtractor()

    def parse(self, jd_text: str, title: str = "") -> ParsedJobDescription:
        """
        Parse a job description string.

        Args:
            jd_text: Free-text job description.
            title: Optional job title (e.g., "Senior Data Scientist").

        Returns:
            ParsedJobDescription with required/preferred skills,
            experience, and seniority extracted.
        """
        if not jd_text or not jd_text.strip():
            return ParsedJobDescription(title=title, raw_text="")

        result = ParsedJobDescription(title=title, raw_text=jd_text)

        # ── Extract experience ──
        result.experience_years = self._extract_experience(jd_text)
        result.seniority_level = self._detect_seniority(jd_text, title)

        # ── Section-based skill extraction ──
        required_section, preferred_section = self._split_sections(jd_text)

        if required_section:
            result.required_skills = self._extractor.extract_skill_set(
                required_section
            )
        if preferred_section:
            result.preferred_skills = self._extractor.extract_skill_set(
                preferred_section
            )

        # ── Fallback: if no sections detected, extract from full text ──
        if not result.required_skills and not result.preferred_skills:
            all_skills = self._extractor.extract_skill_set(jd_text)
            # Conservative default: treat everything as required
            result.required_skills = all_skills

        result.all_skills = result.required_skills | result.preferred_skills

        # ── Keywords (noun phrases from full text) ──
        full_extraction = self._extractor.extract_skills(jd_text)
        result.keywords = sorted(full_extraction["noun_phrases"])

        return result

    def _split_sections(self, text: str) -> tuple:
        """
        Split JD text into required and preferred sections.

        Returns:
            (required_section_text, preferred_section_text)
            Either may be empty string if the header wasn't found.
        """
        lines = text.split("\n")
        required_lines: list = []
        preferred_lines: list = []
        current_bucket = None  # None | "required" | "preferred"

        for line in lines:
            if _REQUIRED_HEADERS.search(line):
                current_bucket = "required"
                continue
            elif _PREFERRED_HEADERS.search(line):
                current_bucket = "preferred"
                continue

            if current_bucket == "required":
                required_lines.append(line)
            elif current_bucket == "preferred":
                preferred_lines.append(line)

        return "\n".join(required_lines), "\n".join(preferred_lines)

    @staticmethod
    def _extract_experience(text: str) -> int:
        """Extract the maximum years-of-experience mentioned."""
        matches = _EXPERIENCE_PATTERN.findall(text)
        if matches:
            return max(int(m) for m in matches)
        return 0

    @staticmethod
    def _detect_seniority(text: str, title: str = "") -> str:
        """Detect seniority level from title or body text."""
        combined = f"{title} {text}".lower()
        for keyword, level in _SENIORITY_MAP.items():
            if keyword in combined:
                return level
        return "not specified"
