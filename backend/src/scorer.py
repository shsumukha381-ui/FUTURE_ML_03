"""
Scoring engine — computes a transparent, weighted score for each candidate.

Scoring formula:
    final_score = (
        W_sim   × cosine_similarity(tfidf(resume), tfidf(jd))  +
        W_req   × (matched_required / total_required)            +
        W_pref  × (matched_preferred / total_preferred)
    ) × 100

Why TF-IDF + cosine similarity?
- It captures overall domain/vocabulary alignment beyond just skill keywords.
- A resume that discusses "deployed ML models on AWS" is more relevant than
  one that merely lists "AWS" as a skill — TF-IDF rewards natural usage.
- Cosine similarity is length-normalised, so a 1-page resume isn't penalised
  against a 3-page one.

Edge cases handled:
- Empty resumes → score 0
- No required skills in JD → required component = 0 (not divided by zero)
- No preferred skills in JD → preferred component = 0
"""

from typing import Dict, List, Set, Tuple

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from src.config import SCORING_WEIGHTS, TFIDF_MAX_FEATURES, TFIDF_NGRAM_RANGE
from src.preprocessing import clean_text
from src.skill_extractor import SkillExtractor
from src.jd_parser import ParsedJobDescription


class ResumeScorer:
    """
    Scores resumes against a parsed job description using TF-IDF
    similarity and skill-match percentages.
    """

    def __init__(
        self,
        skill_extractor: SkillExtractor = None,
        weights: Dict[str, float] = None,
    ):
        """
        Args:
            skill_extractor: Reuse an existing extractor to avoid
                             reloading spaCy + taxonomy.
            weights: Override default scoring weights.
        """
        self._extractor = skill_extractor or SkillExtractor()
        self._weights = weights or SCORING_WEIGHTS

    def score_single(
        self,
        resume_text: str,
        parsed_jd: ParsedJobDescription,
    ) -> Dict:
        """
        Score one resume against a parsed JD.

        Returns:
            {
                "final_score": float (0-100),
                "score_breakdown": {
                    "text_similarity": float,
                    "required_skills_score": float,
                    "preferred_skills_score": float,
                },
                "matched_skills": [...],
                "missing_required_skills": [...],
                "missing_preferred_skills": [...],
                "resume_skills": [...],
            }
        """
        # ── Handle empty resume ──
        if not resume_text or not resume_text.strip():
            return self._empty_result(parsed_jd)

        # ── 1. Text similarity via TF-IDF ──
        similarity = self._compute_tfidf_similarity(
            resume_text, parsed_jd.raw_text
        )

        # ── 2. Skill matching ──
        resume_skills = self._extractor.extract_skill_set(resume_text)
        matched_required, missing_required, req_score = self._match_skills(
            resume_skills, parsed_jd.required_skills
        )
        matched_preferred, missing_preferred, pref_score = self._match_skills(
            resume_skills, parsed_jd.preferred_skills
        )

        # ── 3. Weighted final score ──
        final = (
            self._weights["text_similarity"] * similarity
            + self._weights["required_skills"] * req_score
            + self._weights["preferred_skills"] * pref_score
        ) * 100

        # Clamp to [0, 100]
        final = max(0.0, min(100.0, round(final, 2)))

        return {
            "final_score": final,
            "score_breakdown": {
                "text_similarity": round(similarity * 100, 2),
                "required_skills_score": round(req_score * 100, 2),
                "preferred_skills_score": round(pref_score * 100, 2),
            },
            "matched_skills": sorted(matched_required | matched_preferred),
            "missing_required_skills": sorted(missing_required),
            "missing_preferred_skills": sorted(missing_preferred),
            "resume_skills": sorted(resume_skills),
        }

    def score_batch(
        self,
        resumes: List[Dict[str, str]],
        parsed_jd: ParsedJobDescription,
    ) -> List[Dict]:
        """
        Score multiple resumes. Each resume dict must have at least
        a "text" key, and optionally a "name" key.

        Returns:
            List of score dictionaries (same shape as score_single output,
            plus "candidate" field).
        """
        # ── Batch TF-IDF for efficiency ──
        # Computing TF-IDF on the whole corpus at once is more accurate
        # than one-vs-one because the IDF values reflect the full collection.
        jd_cleaned = clean_text(parsed_jd.raw_text)
        resume_texts_cleaned = [clean_text(r.get("text", "")) for r in resumes]

        # Build a single TF-IDF matrix: [JD, resume_0, resume_1, ...]
        all_docs = [jd_cleaned] + resume_texts_cleaned
        similarities = self._batch_tfidf_similarity(all_docs)

        results = []
        for i, resume in enumerate(resumes):
            resume_text = resume.get("text", "")
            candidate_name = resume.get("name", f"Candidate_{i+1}")
            sim_score = similarities[i]

            if not resume_text or not resume_text.strip():
                result = self._empty_result(parsed_jd)
                result["candidate"] = candidate_name
                results.append(result)
                continue

            # Skill matching
            resume_skills = self._extractor.extract_skill_set(resume_text)
            matched_req, missing_req, req_score = self._match_skills(
                resume_skills, parsed_jd.required_skills
            )
            matched_pref, missing_pref, pref_score = self._match_skills(
                resume_skills, parsed_jd.preferred_skills
            )

            final = (
                self._weights["text_similarity"] * sim_score
                + self._weights["required_skills"] * req_score
                + self._weights["preferred_skills"] * pref_score
            ) * 100
            final = max(0.0, min(100.0, round(final, 2)))

            results.append({
                "candidate": candidate_name,
                "final_score": final,
                "score_breakdown": {
                    "text_similarity": round(sim_score * 100, 2),
                    "required_skills_score": round(req_score * 100, 2),
                    "preferred_skills_score": round(pref_score * 100, 2),
                },
                "matched_skills": sorted(matched_req | matched_pref),
                "missing_required_skills": sorted(missing_req),
                "missing_preferred_skills": sorted(missing_pref),
                "resume_skills": sorted(resume_skills),
            })

        return results

    # ──────────────────────────────────────────
    # Private helpers
    # ──────────────────────────────────────────

    def _compute_tfidf_similarity(self, text_a: str, text_b: str) -> float:
        """Compute cosine similarity between two documents via TF-IDF."""
        cleaned_a = clean_text(text_a)
        cleaned_b = clean_text(text_b)

        if not cleaned_a or not cleaned_b:
            return 0.0

        vectorizer = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES,
            ngram_range=TFIDF_NGRAM_RANGE,
        )
        tfidf_matrix = vectorizer.fit_transform([cleaned_a, cleaned_b])
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
        return float(sim[0][0])

    def _batch_tfidf_similarity(self, docs: List[str]) -> List[float]:
        """
        Compute cosine similarity of docs[1:] against docs[0] (the JD).

        Using a single TF-IDF fit over all documents produces better IDF
        values than pairwise fitting.
        """
        # Filter out completely empty docs — replace with a placeholder
        # so indices stay aligned
        safe_docs = [d if d.strip() else "empty" for d in docs]

        vectorizer = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES,
            ngram_range=TFIDF_NGRAM_RANGE,
        )
        tfidf_matrix = vectorizer.fit_transform(safe_docs)
        # Similarity of each resume (rows 1..N) against the JD (row 0)
        sims = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])
        return sims[0].tolist()

    @staticmethod
    def _match_skills(
        resume_skills: Set[str],
        jd_skills: Set[str],
    ) -> Tuple[Set[str], Set[str], float]:
        """
        Compare resume skills against a JD skill set.

        Returns:
            (matched, missing, match_percentage)
            match_percentage is 0.0 if jd_skills is empty (avoids ZeroDivisionError).
        """
        if not jd_skills:
            return set(), set(), 0.0

        matched = resume_skills & jd_skills
        missing = jd_skills - resume_skills
        pct = len(matched) / len(jd_skills)
        return matched, missing, pct

    def _empty_result(self, parsed_jd: ParsedJobDescription) -> Dict:
        """Return a zero-score result for empty/invalid resumes."""
        return {
            "final_score": 0.0,
            "score_breakdown": {
                "text_similarity": 0.0,
                "required_skills_score": 0.0,
                "preferred_skills_score": 0.0,
            },
            "matched_skills": [],
            "missing_required_skills": sorted(parsed_jd.required_skills),
            "missing_preferred_skills": sorted(parsed_jd.preferred_skills),
            "resume_skills": [],
        }
