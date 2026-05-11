"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ProfileSummary } from "@job-globe/shared-types";

interface SessionState {
  authenticated: boolean;
  email?: string | null;
  hasProfile?: boolean;
}

interface ResumeState {
  signedUrl: string | null;
  rawDeleteAfter: string | null;
  uploadedAt: string | null;
  hasRawFile?: boolean;
}

type ParseStatus = "none" | "pending" | "done";

export default function ProfilePage() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [parseStatus, setParseStatus] = useState<ParseStatus>("none");
  const [parsedAt, setParsedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingResume, setIsDeletingResume] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [sessionRes, profileRes, resumeRes] = await Promise.all([
          fetch("/api/auth/session"),
          fetch("/api/profile"),
          fetch("/api/resume"),
        ]);

        const sessionData = (await sessionRes.json()) as SessionState;
        setSession(sessionData);

        if (sessionData.authenticated) {
          const profileData = (await profileRes.json()) as {
            profile: ProfileSummary | null;
          };
          setProfile(profileData.profile);

          const resumeData = (await resumeRes.json()) as {
            resume: ResumeState | null;
            parseStatus: ParseStatus;
            parsedAt: string | null;
          };
          setResume(resumeData.resume);
          setParseStatus(resumeData.parseStatus ?? "none");
          setParsedAt(resumeData.parsedAt ?? null);
        }
      } catch {
        // Non-fatal — show unauthenticated state
        setSession({ authenticated: false });
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  async function deleteResume() {
    setIsDeletingResume(true);
    setMessage(null);
    try {
      const res = await fetch("/api/resume", { method: "DELETE" });
      if (res.ok) {
        setResume(null);
        setMessage("Raw resume file deleted. Parsed data is retained per the privacy policy.");
      } else {
        setMessage("Failed to delete resume. Please try again.");
      }
    } catch {
      setMessage("Failed to delete resume. Please try again.");
    } finally {
      setIsDeletingResume(false);
    }
  }

  if (isLoading) {
    return (
      <main className="profile-page">
        <p className="muted">Loading profile…</p>
      </main>
    );
  }

  if (!session?.authenticated) {
    return (
      <main className="profile-page">
        <section className="auth-shell">
          <h1>Your Profile</h1>
          <p>
            <Link href="/login">Sign in</Link> or{" "}
            <Link href="/register">create an account</Link> to save your profile and
            get personalised job matches.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <section className="profile-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">Signed in as {session.email}</p>
            <h1>Your Profile</h1>
          </div>
          <Link href="/">Home</Link>
        </header>

        {!profile ? (
          <div className="empty-state">
            <p>No profile yet.</p>
            <Link className="primary-action" href="/onboarding">
              Complete onboarding
            </Link>
          </div>
        ) : (
          <div className="profile-content">
            <section className="profile-section">
              <h2>Preferences</h2>
              <dl className="profile-dl">
                <dt>Role family</dt>
                <dd>{formatLabel(profile.answers.desiredRoleFamily)}</dd>

                <dt>Target locations</dt>
                <dd>
                  {profile.answers.targetLocations.length > 0
                    ? profile.answers.targetLocations.join(", ")
                    : "Not set"}
                </dd>

                <dt>Remote preference</dt>
                <dd>{formatLabel(profile.answers.remotePreference)}</dd>

                <dt>Job types</dt>
                <dd>
                  {profile.answers.jobTypes.length > 0
                    ? profile.answers.jobTypes.map(formatLabel).join(", ")
                    : "Not set"}
                </dd>

                <dt>Company size</dt>
                <dd>{formatLabel(profile.answers.companySizePreference)}</dd>

                <dt>Time to start</dt>
                <dd>{formatLabel(profile.answers.timeToStart)}</dd>

                {profile.answers.salarySensitivity ? (
                  <>
                    <dt>Salary sensitivity</dt>
                    <dd>{formatLabel(profile.answers.salarySensitivity)}</dd>
                  </>
                ) : null}

                {profile.answers.workAuthorization ? (
                  <>
                    <dt>Work authorization</dt>
                    <dd>{formatLabel(profile.answers.workAuthorization)}</dd>
                  </>
                ) : null}
              </dl>

              <p className="muted">
                Last saved: {profile.savedAt ? new Date(profile.savedAt).toLocaleDateString() : "—"}
              </p>

              <Link className="secondary-cta" href="/onboarding">
                Edit preferences
              </Link>
            </section>

            <section className="profile-section">
              <h2>Resume</h2>

              {/* Parse status badge */}
              {parseStatus !== "none" && (
                <p
                  className="muted"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: "0.75rem",
                    fontSize: 13,
                  }}
                >
                  {parseStatus === "done" ? (
                    <>
                      <span
                        aria-label="Parsed"
                        style={{ color: "var(--color-text-success, #16a34a)" }}
                      >
                        ✓
                      </span>{" "}
                      Resume parsed
                      {parsedAt ? ` on ${new Date(parsedAt).toLocaleDateString()}` : ""}.
                      Match scoring is active.
                    </>
                  ) : (
                    <>
                      <span aria-label="Pending" style={{ opacity: 0.6 }}>◌</span>{" "}
                      Resume uploaded — parsing in progress. Match scoring will improve once
                      complete.
                    </>
                  )}
                </p>
              )}

              {resume?.signedUrl ? (
                <div className="resume-status">
                  <p>
                    Resume on file. Uploaded{" "}
                    {resume.uploadedAt
                      ? new Date(resume.uploadedAt).toLocaleDateString()
                      : "recently"}
                    .
                  </p>
                  {resume.rawDeleteAfter ? (
                    <p className="muted">
                      Raw file scheduled for deletion after{" "}
                      {new Date(resume.rawDeleteAfter).toLocaleDateString()}.
                    </p>
                  ) : null}
                  <div className="action-row">
                    <a
                      href={resume.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="secondary-cta"
                    >
                      View resume
                    </a>
                    <button
                      type="button"
                      className="danger-cta"
                      onClick={deleteResume}
                      disabled={isDeletingResume}
                    >
                      {isDeletingResume ? "Deleting…" : "Delete raw file"}
                    </button>
                  </div>
                </div>
              ) : parseStatus === "done" ? (
                <div className="resume-status">
                  <p>
                    Raw resume file deleted per retention policy. Parsed profile data is retained
                    for match scoring.
                  </p>
                </div>
              ) : (
                <div className="empty-state">
                  <p className="muted">No resume on file.</p>
                  <Link href="/onboarding">Upload via onboarding</Link>
                </div>
              )}
              {message ? <p className="success-text">{message}</p> : null}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
