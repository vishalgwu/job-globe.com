"use client";

import { useState, type MouseEvent } from "react";

interface ApplyCTAProps {
  applyUrl: string;
  jobId: string;
}

export function ApplyCTA({ applyUrl, jobId }: ApplyCTAProps) {
  const [isRecording, setIsRecording] = useState(false);

  if (!isValidExternalUrl(applyUrl)) {
    return <p className="error-text">Apply link is unavailable for this demo role.</p>;
  }

  async function handleApply(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (isRecording) return;

    setIsRecording(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, apply_url: applyUrl }),
      });

      if (!response.ok && response.status !== 401) {
        console.warn("[applications] apply click was not recorded", response.status);
      }
    } catch (error) {
      console.warn("[applications] apply click request failed", error);
    } finally {
      setIsRecording(false);
      const opened = window.open(applyUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.assign(applyUrl);
      }
    }
  }

  return (
    <a
      className="primary-cta apply-cta"
      href={applyUrl}
      target="_blank"
      rel="noreferrer"
      aria-busy={isRecording}
      onClick={handleApply}
    >
      {isRecording ? "Opening..." : "Apply on Official Site"}
    </a>
  );
}

function isValidExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname !== "localhost";
  } catch {
    return false;
  }
}
