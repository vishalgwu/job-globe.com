"use client";

interface ResumeUploadProps {
  fileName: string | null;
  consentAccepted: boolean;
  onFileNameChange: (fileName: string | null) => void;
  onConsentChange: (accepted: boolean) => void;
}

export function ResumeUpload({
  fileName,
  consentAccepted,
  onFileNameChange,
  onConsentChange,
}: ResumeUploadProps) {
  return (
    <div className="resume-upload">
      <label className="field-control field-control--wide">
        <span>Resume file</span>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={(event) => onFileNameChange(event.target.files?.[0]?.name ?? null)}
        />
      </label>
      {fileName ? (
        <p className="muted">Selected: {fileName}. Parsing will be added in Step 4.</p>
      ) : null}
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={consentAccepted}
          onChange={(event) => onConsentChange(event.target.checked)}
        />
        <span>
          I consent to Jarvis Job Globe storing this demo file reference for profile setup. Resume
          parsing and raw file storage are not active in Step 2.
        </span>
      </label>
    </div>
  );
}
