import json
from pathlib import Path
from src.jd_parser import JDParser
from src.scorer import ResumeScorer
from src.ranker import rank_candidates
import asyncio
from api import parse_uploaded_file
from fastapi import UploadFile

async def test_scores():
    # Load JD
    with open("data/sample_jds.json", "r") as f:
        jd_data = json.load(f)[0]
    
    jd_parser = JDParser()
    scorer = ResumeScorer()
    
    parsed_jd = jd_parser.parse(jd_data["text"], jd_data.get("title", ""))
    
    # Load resumes
    resume_dicts = []
    resume_files = list(Path("data/resumes").glob("*.txt"))
    for file_path in resume_files:
        with open(file_path, "rb") as f:
            content = f.read()
            # mock UploadFile
            class MockUploadFile:
                def __init__(self, filename, content):
                    self.filename = filename
                    self._content = content
                async def read(self):
                    return self._content
            
            parsed = await parse_uploaded_file(MockUploadFile(file_path.name, content))
            if parsed:
                resume_dicts.append(parsed)
                
    scored = scorer.score_batch(resume_dicts, parsed_jd)
    ranked = rank_candidates(scored)
    
    for r in ranked:
        print(f"{r['candidate']:20s} | {r['final_score']:5.1f} | Tier: {r['tier']} | req: {r['score_breakdown']['required_skills_score']:4.1f}%")
        if "Mehta" in r['candidate'] or "Kapoor" in r['candidate']:
            print(f"  Missing req: {r['missing_required_skills']}")
            print(f"  Missing pref: {r['missing_preferred_skills']}")

if __name__ == "__main__":
    asyncio.run(test_scores())
