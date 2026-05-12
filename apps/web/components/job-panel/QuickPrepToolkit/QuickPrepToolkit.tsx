"use client";

import { useCallback, useEffect, useState } from "react";

import type { QuickPrepPlaceholder } from "@job-globe/shared-types";

interface QuickPrepContent {
  company_research_tips: string[];
  likely_interview_questions: string[];
  skills_to_highlight: string[];
  preparation_checklist: string[];
  red_flags: string[];
}

interface QuickPrepResponse {
  content?: QuickPrepContent;
  error?: string;
}

interface QuickPrepToolkitProps {
  jobId: string;
  quickPrep: QuickPrepPlaceholder;
}

type PrepStatus = "idle" | "loading" | "ready" | "error";

export function QuickPrepToolkit({ jobId, quickPrep }: QuickPrepToolkitProps) {
  const [content, setContent] = useState<QuickPrepContent | null>(null);
  const [status, setStatus] = useState<PrepStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const loadPrep = useCallback(
    async (signal?: AbortSignal) => {
      setStatus("loading");
      setError(null);

      try {
        const response = await fetch(`/api/quick-prep?jobId=${encodeURIComponent(jobId)}`, {
          cache: "no-store",
          signal,
        });
        const data = (await response.json().catch(() => ({}))) as QuickPrepResponse;
        if (!response.ok || !data.content) {
          throw new Error(data.error ?? "Quick prep is unavailable.");
        }
        setContent(data.content);
        setStatus("ready");
      } catch (prepError) {
        if (prepError instanceof DOMException && prepError.name === "AbortError") {
          return;
        }
        setStatus("error");
        setError(prepError instanceof Error ? prepError.message : "Quick prep is unavailable.");
      }
    },
    [jobId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setContent(null);
    void loadPrep(controller.signal);

    return () => controller.abort();
  }, [loadPrep]);

  const skillsToHighlight = content?.skills_to_highlight ?? quickPrep.skillsIHave;
  const interviewQuestions = content?.likely_interview_questions ?? quickPrep.interviewQuestions;
  const companyTips = content?.company_research_tips ?? [];
  const checklist = content?.preparation_checklist ?? [];
  const redFlags = content?.red_flags ?? [];

  return (
    <section className="quick-prep" aria-labelledby="quick-prep-title">
      <div className="quick-prep-head">
        <h3 id="quick-prep-title">Quick Prep</h3>
        <button
          className="secondary-cta quick-prep-refresh"
          type="button"
          disabled={status === "loading"}
          onClick={() => void loadPrep()}
        >
          {status === "loading" ? "Generating" : "Refresh"}
        </button>
      </div>
      {status === "loading" ? (
        <p className="quick-prep-status" aria-live="polite">
          Generating live prep...
        </p>
      ) : null}
      {error ? (
        <p className="error-text" role="status">
          {error}
        </p>
      ) : null}
      <details open>
        <summary>Role summary</summary>
        <p>{quickPrep.roleSummary}</p>
      </details>
      <details>
        <summary>Skills</summary>
        <p>
          <strong>Highlight:</strong> {formatList(skillsToHighlight)}
        </p>
        {quickPrep.skillsMissing.length > 0 ? (
          <p>
            <strong>Gap:</strong> {formatList(quickPrep.skillsMissing)}
          </p>
        ) : null}
      </details>
      <details>
        <summary>Interview questions</summary>
        <ul>
          {interviewQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </details>
      <details>
        <summary>Company brief</summary>
        {companyTips.length > 0 ? (
          <ul className="prep-list">
            {companyTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : (
          <p>{quickPrep.companyBrief}</p>
        )}
      </details>
      <details>
        <summary>Checklist</summary>
        {checklist.length > 0 ? (
          <ul className="prep-list">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>{quickPrep.resumeTailoringNote}</p>
        )}
      </details>
      {redFlags.length > 0 ? (
        <details>
          <summary>Watchouts</summary>
          <ul className="prep-list">
            {redFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "Not specified";
}
