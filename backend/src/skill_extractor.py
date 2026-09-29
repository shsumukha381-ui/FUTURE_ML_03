"""
Skill extraction using spaCy PhraseMatcher + noun-phrase fallback.

Architecture:
1. PRIMARY: PhraseMatcher loaded with our curated taxonomy
   → High-precision extraction of known skills.
2. FALLBACK: spaCy noun-chunk extraction
   → Catches emerging skills not in our taxonomy (e.g., a brand-new
     framework). These are lower-confidence but still useful for
     TF-IDF scoring.

Why PhraseMatcher over EntityRuler?
- PhraseMatcher is faster for large pattern sets (O(n) scan).
- We don't need entity labels per occurrence — just a set of matched skills.
- EntityRuler is better when you need to train/save a custom NER model,
  which is out of scope for this project.
"""

import json
from typing import Dict, List, Set

import spacy
from spacy.matcher import PhraseMatcher

from src.config import SKILLS_TAXONOMY_PATH, SPACY_MODEL
from src.preprocessing import clean_text_for_skills


ALIASES = {
    "nlp": "natural language processing",
    "sklearn": "scikit-learn",
    "ml": "machine learning",
    "k8s": "kubernetes",
    "gcp": "google cloud",
    "aws": "amazon web services",
    "reactjs": "react",
    "react.js": "react",
    "vuejs": "vue",
    "vue.js": "vue",
    "nodejs": "node.js",
    "version control": "git",
    "presentation": "communication",
    "matplotlib": "data visualization",
    "seaborn": "data visualization",
    "plotly": "data visualization",
    "a/b testing": "statistical analysis"
}


class SkillExtractor:
    """
    Extracts skills from text using a taxonomy-driven PhraseMatcher
    with a noun-phrase fallback for unknown skills.
    """

    def __init__(self, taxonomy_path: str = None):
        """
        Args:
            taxonomy_path: Path to skills_taxonomy.json.
                           Defaults to the path in config.py.
        """
        self._taxonomy_path = taxonomy_path or str(SKILLS_TAXONOMY_PATH)
        self._nlp = spacy.load(SPACY_MODEL)
        self._matcher = PhraseMatcher(self._nlp.vocab, attr="LOWER")
        self._taxonomy: Dict[str, List[str]] = {}
        # Flat set for O(1) lookups during gap analysis
        self._all_known_skills: Set[str] = set()

        self._load_taxonomy()

    def _load_taxonomy(self) -> None:
        """
        Load skills from JSON and register patterns with PhraseMatcher.

        Each category becomes a separate matcher label so we can later
        report WHICH category a matched skill belongs to (useful for
        the explanation module).
        """
        with open(self._taxonomy_path, "r", encoding="utf-8") as f:
            self._taxonomy = json.load(f)

        for category, skills in self._taxonomy.items():
            patterns = [self._nlp.make_doc(skill.lower()) for skill in skills]
            self._matcher.add(category, patterns)
            self._all_known_skills.update(skill.lower() for skill in skills)

    @property
    def taxonomy(self) -> Dict[str, List[str]]:
        """Return the loaded taxonomy for inspection/testing."""
        return self._taxonomy

    @property
    def all_known_skills(self) -> Set[str]:
        """Flat set of every skill in the taxonomy (lowercased)."""
        return self._all_known_skills

    def extract_skills(self, text: str) -> Dict[str, object]:
        """
        Extract skills from raw text.

        Args:
            text: Raw resume or JD text (will be lightly cleaned internally).

        Returns:
            Dictionary with:
                - "taxonomy_matches": set of skills found via PhraseMatcher
                - "noun_phrases": set of noun phrases (fallback candidates)
                - "all_skills": union of both sets
                - "category_matches": dict mapping category → matched skills
        """
        cleaned = clean_text_for_skills(text)
        if not cleaned:
            return {
                "taxonomy_matches": set(),
                "noun_phrases": set(),
                "all_skills": set(),
                "category_matches": {},
            }

        doc = self._nlp(cleaned)

        # ── Primary: PhraseMatcher ──
        taxonomy_matches: Set[str] = set()
        category_matches: Dict[str, Set[str]] = {}
        matches = self._matcher(doc)

        for match_id, start, end in matches:
            # match_id is the hash of the category label
            category = self._nlp.vocab.strings[match_id]
            skill_text = doc[start:end].text.lower()
            skill_text = ALIASES.get(skill_text, skill_text)
            taxonomy_matches.add(skill_text)
            category_matches.setdefault(category, set()).add(skill_text)

        # ── Fallback: noun phrases ──
        # Only keep noun phrases ≥ 2 chars that aren't already matched
        noun_phrases: Set[str] = set()
        for chunk in doc.noun_chunks:
            phrase = chunk.text.strip().lower()
            phrase = ALIASES.get(phrase, phrase)
            if len(phrase) >= 2 and phrase not in taxonomy_matches:
                noun_phrases.add(phrase)

        return {
            "taxonomy_matches": taxonomy_matches,
            "noun_phrases": noun_phrases,
            "all_skills": taxonomy_matches | noun_phrases,
            "category_matches": {k: list(v) for k, v in category_matches.items()},
        }

    def extract_skill_set(self, text: str) -> Set[str]:
        """
        Convenience method — returns only the taxonomy-matched skills.

        Use this when you need a clean set for scoring (noun phrases
        are too noisy for precise skill-gap reports).
        """
        return self.extract_skills(text)["taxonomy_matches"]
