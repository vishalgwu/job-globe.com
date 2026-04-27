"use client";

interface ApplyCTAProps {
  applyUrl: string;
}

export function ApplyCTA({ applyUrl }: ApplyCTAProps) {
  if (!isValidExternalUrl(applyUrl)) {
    return <p className="error-text">Apply link is unavailable for this demo role.</p>;
  }

  return (
    <a className="primary-action apply-cta" href={applyUrl} target="_blank" rel="noreferrer">
      Apply on Official Site
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
