from pathlib import Path


def extract_resume_text(path: Path) -> str:
    if path.suffix.lower() == ".txt":
        return path.read_text(encoding="utf-8")
    message = "PDF and DOCX extraction are wired after dependency install verification."
    raise NotImplementedError(message)
