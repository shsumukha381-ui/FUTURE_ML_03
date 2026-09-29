"""
Text preprocessing pipeline for resumes and job descriptions.

Design decisions:
- We strip URLs, emails, and phone numbers FIRST because they add noise
  to TF-IDF without carrying skill-relevant signal.
- Lemmatization (not stemming) preserves readable tokens, which matters
  when we later show matched skills to HR users.
- pdfplumber is used for PDF extraction because it handles multi-column
  layouts better than PyPDF2 for typical resume formats.
"""

import re
from typing import Optional

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

from src.config import MIN_TOKEN_LENGTH

# ──────────────────────────────────────────────
# Ensure NLTK data is available (one-time download)
# ──────────────────────────────────────────────
_NLTK_RESOURCES = ["stopwords", "wordnet", "punkt_tab", "omw-1.4", "averaged_perceptron_tagger"]
for _res in _NLTK_RESOURCES:
    try:
        nltk.data.find(f"corpora/{_res}" if _res != "punkt_tab" and _res != "averaged_perceptron_tagger" else f"taggers/{_res}" if _res == "averaged_perceptron_tagger" else f"tokenizers/{_res}")
    except LookupError:
        nltk.download(_res, quiet=True)

_STOP_WORDS = set(stopwords.words("english"))
_LEMMATIZER = WordNetLemmatizer()

# ──────────────────────────────────────────────
# Regex patterns (compiled once for performance)
# ──────────────────────────────────────────────
_URL_PATTERN = re.compile(r"https?://\S+|www\.\S+")
_EMAIL_PATTERN = re.compile(r"\S+@\S+\.\S+")
# Matches common phone formats: +1-234-567-8901, (234) 567-8901, etc.
_PHONE_PATTERN = re.compile(
    r"(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}"
)
_SPECIAL_CHARS_PATTERN = re.compile(r"[^a-zA-Z0-9\s]")
_MULTI_SPACE_PATTERN = re.compile(r"\s+")


def read_pdf(file_path: str) -> str:
    """
    Extract raw text from a PDF file using pdfplumber.

    Args:
        file_path: Path to the PDF resume.

    Returns:
        Concatenated text from all pages.

    Raises:
        FileNotFoundError: If the PDF does not exist.
        ImportError: If pdfplumber is not installed.
    """
    try:
        import pdfplumber
    except ImportError:
        raise ImportError(
            "pdfplumber is required for PDF support. "
            "Install it with: pip install pdfplumber"
        )

    pages_text = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text)

    return "\n".join(pages_text)


def remove_urls(text: str) -> str:
    """Strip URLs — they add TF-IDF noise without skill signal."""
    return _URL_PATTERN.sub(" ", text)


def remove_emails(text: str) -> str:
    """Strip email addresses — PII that doesn't help scoring."""
    return _EMAIL_PATTERN.sub(" ", text)


def remove_phone_numbers(text: str) -> str:
    """Strip phone numbers — PII cleanup."""
    return _PHONE_PATTERN.sub(" ", text)


def remove_special_characters(text: str) -> str:
    """Keep only alphanumeric characters and whitespace."""
    return _SPECIAL_CHARS_PATTERN.sub(" ", text)


def normalize_whitespace(text: str) -> str:
    """Collapse multiple spaces/newlines into a single space."""
    return _MULTI_SPACE_PATTERN.sub(" ", text).strip()


def tokenize_and_lemmatize(text: str) -> str:
    """
    Tokenize, remove stopwords, and lemmatize.

    Why lemmatize instead of stem?
    - "managing" → "managing" (stem) vs "manage" (lemma)
    - Lemmas are real words, making skill-match output readable for HR.
    """
    tokens = text.split()
    processed = [
        _LEMMATIZER.lemmatize(token)
        for token in tokens
        if token not in _STOP_WORDS and len(token) >= MIN_TOKEN_LENGTH
    ]
    return " ".join(processed)


def clean_text(text: Optional[str]) -> str:
    """
    Full preprocessing pipeline: clean → normalize → lemmatize.

    Args:
        text: Raw resume or JD text. None/empty strings are handled gracefully.

    Returns:
        Cleaned, lowercased, lemmatized text ready for TF-IDF and skill extraction.
    """
    if not text or not text.strip():
        return ""

    text = text.lower()
    text = remove_urls(text)
    text = remove_emails(text)
    text = remove_phone_numbers(text)
    text = remove_special_characters(text)
    text = normalize_whitespace(text)
    text = tokenize_and_lemmatize(text)
    return text


def clean_text_for_skills(text: Optional[str]) -> str:
    """
    Light cleaning for skill extraction — preserves multi-word phrases.

    Why a separate function?
    - Full cleaning removes hyphens and special chars, which breaks
      skill names like "C++", "Node.js", or "CI/CD".
    - For skill matching we only strip PII and lowercase.
    """
    if not text or not text.strip():
        return ""

    text = text.lower()
    text = remove_urls(text)
    text = remove_emails(text)
    text = remove_phone_numbers(text)
    text = normalize_whitespace(text)
    return text
