"use client";

import { useRef, useState } from "react";

interface ResumeUploadProps {
  fileName: string | null;
  consentAccepted: boolean;
  onFileNameChange: (fileName: string | null) => void;
  onConsentChange: (accepted: boolean) => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function ResumeUpload({
  fileName,
  consentAccepted,
  onFileNameChange,
  onConsentChange,
}: ResumeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rawDeleteAfter, setRawDeleteAfter] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Update parent with the selected file name immediately
    onFileNameChange(file.name);
    setUploadError(null);

    // Only attempt the upload if the user has given consent
    if (!consentAccepted) {
      // Defer upload until consent is checked — we just record the selection
      return;
    }

    await uploadFile(file);
  }

  async function uploadFile(file: File) {
    setUploadStatus("uploading");
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      });

      if (res.status === 401) {
        // Not authenticated — record consent/file choice in onboarding but skip upload
        setUploadStatus("idle");
        return;
      }

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        rawDeleteAfter?: string;
      };

      if (!res.ok || !data.ok) {
        setUploadStatus("error");
        setUploadError(data.error ?? "Upload failed. Please try again.");
        return;
      }

      setUploadStatus("success");
      if (data.rawDeleteAfter) {
        setRawDeleteAfter(data.rawDeleteAfter);
      }
    } catch {
      setUploadStatus("error");
      setUploadError("Network error. Please try again.");
    }
  }

  async function handleConsentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const accepted = event.target.checked;
    onConsentChange(accepted);

    // If consent was just granted and a file is already selected, upload now
    if (accepted && inputRef.current?.files?.[0]) {
      await uploadFile(inputRef.current.files[0]);
    }
  }

  return (
    <div className="resume-upload">
      <label className="field-control field-control--wide">
        <span>Resume file</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleFileChange}
          disabled={uploadStatus === "uploading"}
        />
      </label>

      {fileName && uploadStatus === "idle" ? (
        <p className="muted">
          Selected: {fileName}.{" "}
          {consentAccepted
            ? "Ready to upload."
            : "Accept consent below to upload."}
        </p>
      ) : null}

      {uploadStatus === "uploading" ? (
        <p className="muted">Uploading {fileName}…</p>
      ) : null}

      {uploadStatus === "success" ? (
        <p className="success-text">
          {fileName} uploaded.{" "}
          {rawDeleteAfter
            ? `Raw file will be deleted after ${new Date(rawDeleteAfter).toLocaleDateString()} per our privacy policy.`
            : ""}
        </p>
      ) : null}

      {uploadStatus === "error" && uploadError ? (
        <p className="error-text">{uploadError}</p>
      ) : null}

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={consentAccepted}
          onChange={handleConsentChange}
          disabled={uploadStatus === "uploading"}
        />
        <span>
          I consent to Jarvis Job Globe securely storing my resume for profile
          setup. The raw file is automatically deleted after 30 days. Parsed
          data is retained while my account is active.{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy policy
          </a>
          .
        </span>
      </label>
    </div>
  );
}
