"""
Unit tests for the resume screening pipeline.

Coverage:
- preprocessing: cleaning, edge cases, PDF fallback
- skill_extractor: taxonomy matching, empty input
- scorer: scoring formula, edge cases
- ranker: ranking order, ties
- jd_parser: section splitting, experience extraction
"""

import pytest
import sys
from pathlib import Path

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.preprocessing import (
    clean_text,
    clean_text_for_skills,
    remove_urls,
    remove_emails,
    remove_phone_numbers,
    remove_special_characters,
)
from src.skill_extractor import SkillExtractor
from src.jd_parser import JDParser, ParsedJobDescription
from src.scorer import ResumeScorer
from src.ranker import rank_candidates, assign_tier


# ═══════════════════════════════════════════════
# Preprocessing tests
# ═══════════════════════════════════════════════

class TestPreprocessing:
    """Tests for text cleaning and normalisation."""

    def test_remove_urls(self):
        text = "Visit https://example.com for more info"
        result = remove_urls(text)
        assert "https://example.com" not in result
        assert "Visit" in result

    def test_remove_emails(self):
        text = "Contact john@example.com for details"
        result = remove_emails(text)
        assert "john@example.com" not in result

    def test_remove_phone_numbers(self):
        text = "Call me at +1-234-567-8901 today"
        result = remove_phone_numbers(text)
        assert "234-567-8901" not in result

    def test_remove_special_characters(self):
        text = "Python & Java: C++ (2024)"
        result = remove_special_characters(text)
        assert "&" not in result
        assert ":" not in result
        assert "Python" in result

    def test_clean_text_basic(self):
        text = "I am a Data Scientist using Python and Machine Learning."
        result = clean_text(text)
        # Stopwords like "I", "am", "a", "and" should be removed
        assert "data" in result
        assert "scientist" in result

    def test_clean_text_empty(self):
        assert clean_text("") == ""
        assert clean_text(None) == ""
        assert clean_text("   ") == ""

    def test_clean_text_for_skills_preserves_phrases(self):
        """Light cleaning should keep multi-word skill names intact."""
        text = "Experience with Node.js and CI/CD pipelines"
        result = clean_text_for_skills(text)
        # Should be lowercased but not aggressively stripped
        assert "node" in result.lower()
        assert "ci" in result.lower()

    def test_clean_text_lowercases(self):
        text = "Python JAVA TensorFlow"
        result = clean_text(text)
        assert result == result.lower()


# ═══════════════════════════════════════════════
# Skill Extractor tests
# ═══════════════════════════════════════════════

class TestSkillExtractor:
    """Tests for taxonomy-based skill extraction."""

    @pytest.fixture
    def extractor(self):
        return SkillExtractor()

    def test_extracts_known_skills(self, extractor):
        text = "I have experience with Python, machine learning, and Docker"
        skills = extractor.extract_skill_set(text)
        assert "python" in skills
        assert "machine learning" in skills
        assert "docker" in skills

    def test_empty_input(self, extractor):
        skills = extractor.extract_skill_set("")
        assert len(skills) == 0

    def test_none_input(self, extractor):
        skills = extractor.extract_skill_set(None)
        assert len(skills) == 0

    def test_taxonomy_loaded(self, extractor):
        assert len(extractor.all_known_skills) > 50, (
            "Taxonomy should have at least 50 skills"
        )

    def test_extract_skills_returns_categories(self, extractor):
        text = "I use Python and React for web development"
        result = extractor.extract_skills(text)
        assert "category_matches" in result
        assert isinstance(result["category_matches"], dict)

    def test_case_insensitive(self, extractor):
        text_lower = "python tensorflow aws"
        text_upper = "PYTHON TENSORFLOW AWS"
        skills_lower = extractor.extract_skill_set(text_lower)
        skills_upper = extractor.extract_skill_set(text_upper)
        assert skills_lower == skills_upper


# ═══════════════════════════════════════════════
# JD Parser tests
# ═══════════════════════════════════════════════

class TestJDParser:
    """Tests for job description parsing."""

    @pytest.fixture
    def parser(self):
        return JDParser()

    def test_parse_with_sections(self, parser):
        jd = (
            "Required Skills\n"
            "- Python\n"
            "- Machine Learning\n"
            "\n"
            "Preferred Skills\n"
            "- Docker\n"
            "- AWS\n"
        )
        result = parser.parse(jd, "Data Scientist")
        assert "python" in result.required_skills
        assert result.title == "Data Scientist"

    def test_parse_empty(self, parser):
        result = parser.parse("")
        assert len(result.required_skills) == 0
        assert len(result.preferred_skills) == 0

    def test_experience_extraction(self, parser):
        jd = "We need someone with 5+ years of experience in Python"
        result = parser.parse(jd)
        assert result.experience_years == 5

    def test_seniority_detection(self, parser):
        jd = "Looking for a senior data scientist"
        result = parser.parse(jd, "Senior Data Scientist")
        assert result.seniority_level == "senior"

    def test_fallback_to_required(self, parser):
        """When no section headers exist, all skills should be required."""
        jd = "We need Python, SQL, and machine learning skills"
        result = parser.parse(jd)
        # All extracted skills should end up in required
        assert len(result.required_skills) > 0
        assert len(result.preferred_skills) == 0


# ═══════════════════════════════════════════════
# Scorer tests
# ═══════════════════════════════════════════════

class TestScorer:
    """Tests for the scoring engine."""

    @pytest.fixture
    def scorer(self):
        return ResumeScorer()

    def test_score_range(self, scorer):
        """Final score must be between 0 and 100."""
        jd = ParsedJobDescription(
            raw_text="Python machine learning data science",
            required_skills={"python", "machine learning"},
            preferred_skills={"docker"},
        )
        result = scorer.score_single(
            "Python developer with machine learning experience", jd
        )
        assert 0 <= result["final_score"] <= 100

    def test_empty_resume_scores_zero(self, scorer):
        jd = ParsedJobDescription(
            raw_text="Python machine learning",
            required_skills={"python"},
        )
        result = scorer.score_single("", jd)
        assert result["final_score"] == 0.0

    def test_perfect_match_scores_high(self, scorer):
        """A resume that mirrors the JD should score highly."""
        jd_text = "Python machine learning scikit-learn data science"
        jd = ParsedJobDescription(
            raw_text=jd_text,
            required_skills={"python", "machine learning", "scikit-learn"},
            preferred_skills={"data visualization"},
        )
        resume = "Expert in Python machine learning using scikit-learn for data science and data visualization"
        result = scorer.score_single(resume, jd)
        assert result["final_score"] > 50  # Should be well above average

    def test_score_breakdown_present(self, scorer):
        jd = ParsedJobDescription(
            raw_text="Python",
            required_skills={"python"},
        )
        result = scorer.score_single("Python developer", jd)
        assert "score_breakdown" in result
        assert "text_similarity" in result["score_breakdown"]
        assert "required_skills_score" in result["score_breakdown"]
        assert "preferred_skills_score" in result["score_breakdown"]

    def test_batch_scoring(self, scorer):
        jd = ParsedJobDescription(
            raw_text="Python machine learning",
            required_skills={"python", "machine learning"},
        )
        resumes = [
            {"name": "Alice", "text": "Python machine learning expert"},
            {"name": "Bob", "text": "Java web developer"},
        ]
        results = scorer.score_batch(resumes, jd)
        assert len(results) == 2
        assert results[0]["candidate"] == "Alice"
        assert results[1]["candidate"] == "Bob"


# ═══════════════════════════════════════════════
# Ranker tests
# ═══════════════════════════════════════════════

class TestRanker:
    """Tests for candidate ranking."""

    def test_ranking_order(self):
        scored = [
            {"candidate": "A", "final_score": 50},
            {"candidate": "B", "final_score": 80},
            {"candidate": "C", "final_score": 65},
        ]
        ranked = rank_candidates(scored)
        assert ranked[0]["candidate"] == "B"
        assert ranked[1]["candidate"] == "C"
        assert ranked[2]["candidate"] == "A"

    def test_tie_handling(self):
        scored = [
            {"candidate": "A", "final_score": 75},
            {"candidate": "B", "final_score": 75},
            {"candidate": "C", "final_score": 60},
        ]
        ranked = rank_candidates(scored)
        assert ranked[0]["rank"] == 1
        assert ranked[1]["rank"] == 1  # Tie!
        assert ranked[2]["rank"] == 3  # Competition ranking

    def test_empty_input(self):
        assert rank_candidates([]) == []

    def test_tier_assignment(self):
        assert assign_tier(85) == "Strong Match"
        assert assign_tier(55) == "Moderate Match"
        assert assign_tier(20) == "Weak Match"

    def test_ranks_have_tiers(self):
        scored = [{"candidate": "A", "final_score": 90}]
        ranked = rank_candidates(scored)
        assert "tier" in ranked[0]
        assert ranked[0]["tier"] == "Strong Match"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
