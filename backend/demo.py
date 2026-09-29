"""Quick end-to-end demo — validates the full pipeline works."""
import json, sys
sys.path.insert(0, ".")

from src.config import DATA_DIR
from src.skill_extractor import SkillExtractor
from src.jd_parser import JDParser
from src.scorer import ResumeScorer
from src.ranker import rank_candidates
from src.explain import explain_candidate, explain_score_breakdown

# Load sample data
with open(DATA_DIR / "sample_resumes.json") as f:
    resumes = json.load(f)
with open(DATA_DIR / "sample_jds.json") as f:
    jds = json.load(f)

# Pipeline
extractor = SkillExtractor()
parser = JDParser(skill_extractor=extractor)
scorer = ResumeScorer(skill_extractor=extractor)

parsed_jd = parser.parse(jds[0]["text"], jds[0]["title"])
print(f"JD: {parsed_jd.title}")
print(f"Required: {sorted(parsed_jd.required_skills)}")
print(f"Preferred: {sorted(parsed_jd.preferred_skills)}")
print()

scored = scorer.score_batch(resumes, parsed_jd)
ranked = rank_candidates(scored)

for r in ranked:
    print(f"#{r['rank']} {r['candidate']:20s}  {r['final_score']:5.1f}/100  ({r['tier']})")

print("\n--- Top candidate explanation ---")
top = ranked[0]
print(explain_candidate(top))
print()
print(explain_score_breakdown(top))
print()
print("--- JSON output (top candidate) ---")
output = {
    "candidate": top["candidate"],
    "final_score": top["final_score"],
    "score_breakdown": top["score_breakdown"],
    "matched_skills": top["matched_skills"],
    "missing_required_skills": top["missing_required_skills"],
    "missing_preferred_skills": top["missing_preferred_skills"],
    "explanation": explain_candidate(top),
}
print(json.dumps(output, indent=2))
