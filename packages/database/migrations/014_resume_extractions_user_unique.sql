-- Migration 014: enforce the one-resume-row-per-user invariant used by /api/resume.

CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_extractions_user_unique
ON resume_extractions(user_id);
