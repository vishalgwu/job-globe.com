from pydantic import BaseModel, Field


class NormalizedProfile(BaseModel):
    headline: str = ""
    skills: list[str] = Field(default_factory=list)
    confidence: float = 0.0
