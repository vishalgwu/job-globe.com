"use client";

import { useState } from "react";
import Link from "next/link";

import type {
  CompanySizePreference,
  JobType,
  OnboardingAnswers,
  ProfileSaveResponse,
  RemoteMode,
  SalarySensitivity,
  TimeToStart,
} from "@job-globe/shared-types";

import { useUserStore } from "../../../stores/userStore";
import { QuestionStep } from "../QuestionStep/QuestionStep";
import { ResumeUpload } from "../ResumeUpload/ResumeUpload";

const roleFamilies = [
  "software-engineering",
  "machine-learning",
  "data-analytics",
  "product-management",
  "design",
  "security",
  "operations",
];

const remotePreferences: (RemoteMode | "flexible")[] = ["remote", "hybrid", "on-site", "flexible"];
const jobTypes: JobType[] = ["internship", "new-grad", "full-time", "contract"];
const salarySensitivities: SalarySensitivity[] = ["low", "medium", "high"];
const companySizePreferences: CompanySizePreference[] = [
  "startup",
  "mid-market",
  "enterprise",
  "no-preference",
];
const timeToStartOptions: TimeToStart[] = [
  "now",
  "one-to-three-months",
  "three-plus-months",
  "exploring",
];
const workAuthorizationOptions = [
  "authorized-now",
  "requires-sponsorship",
  "student-visa",
  "prefer-not-to-say",
];

const defaultAnswers: OnboardingAnswers = {
  desiredRoleFamily: "",
  targetLocations: [],
  remotePreference: "flexible",
  jobTypes: [],
  salarySensitivity: null,
  companySizePreference: "no-preference",
  timeToStart: "exploring",
  workAuthorization: null,
  resumeConsentAccepted: false,
  resumeFileName: null,
};

export function OnboardingFlow() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(defaultAnswers);
  const [locationDraft, setLocationDraft] = useState("");
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const { setOnboardingAnswers, setSavingProfile, setProfile, setProfileErrors, profileErrors } =
    useUserStore();

  function updateAnswers(patch: Partial<OnboardingAnswers>) {
    const nextAnswers = { ...answers, ...patch };
    setAnswers(nextAnswers);
    setOnboardingAnswers(nextAnswers);
  }

  const steps = [
    {
      title: "Desired role family",
      isValid: Boolean(answers.desiredRoleFamily),
      content: (
        <div className="choice-grid">
          {roleFamilies.map((role) => (
            <button
              key={role}
              type="button"
              className={answers.desiredRoleFamily === role ? "is-selected" : undefined}
              onClick={() => updateAnswers({ desiredRoleFamily: role })}
            >
              {formatLabel(role)}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Target locations",
      isValid: answers.targetLocations.length > 0,
      content: (
        <div className="stack">
          <div className="inline-input">
            <input
              value={locationDraft}
              placeholder="City, country, or Remote"
              onChange={(event) => setLocationDraft(event.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                const nextLocation = locationDraft.trim();
                if (nextLocation && !answers.targetLocations.includes(nextLocation)) {
                  updateAnswers({ targetLocations: [...answers.targetLocations, nextLocation] });
                  setLocationDraft("");
                }
              }}
            >
              Add
            </button>
          </div>
          <div className="chip-row">
            {answers.targetLocations.map((location) => (
              <button
                key={location}
                type="button"
                onClick={() =>
                  updateAnswers({
                    targetLocations: answers.targetLocations.filter((item) => item !== location),
                  })
                }
              >
                {location} X
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Remote preference",
      isValid: Boolean(answers.remotePreference),
      content: (
        <div className="choice-grid">
          {remotePreferences.map((preference) => (
            <button
              key={preference}
              type="button"
              className={answers.remotePreference === preference ? "is-selected" : undefined}
              onClick={() => updateAnswers({ remotePreference: preference })}
            >
              {formatLabel(preference)}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Job type",
      isValid: answers.jobTypes.length > 0,
      content: (
        <div className="choice-grid">
          {jobTypes.map((jobType) => {
            const selected = answers.jobTypes.includes(jobType);

            return (
              <button
                key={jobType}
                type="button"
                className={selected ? "is-selected" : undefined}
                onClick={() =>
                  updateAnswers({
                    jobTypes: selected
                      ? answers.jobTypes.filter((item) => item !== jobType)
                      : [...answers.jobTypes, jobType],
                  })
                }
              >
                {formatLabel(jobType)}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Salary sensitivity",
      isValid: true,
      isOptional: true,
      description: "Optional",
      content: (
        <div className="choice-grid">
          {salarySensitivities.map((salarySensitivity) => (
            <button
              key={salarySensitivity}
              type="button"
              className={
                answers.salarySensitivity === salarySensitivity ? "is-selected" : undefined
              }
              onClick={() => updateAnswers({ salarySensitivity })}
            >
              {formatLabel(salarySensitivity)}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Company size",
      isValid: true,
      content: (
        <div className="choice-grid">
          {companySizePreferences.map((preference) => (
            <button
              key={preference}
              type="button"
              className={answers.companySizePreference === preference ? "is-selected" : undefined}
              onClick={() => updateAnswers({ companySizePreference: preference })}
            >
              {formatLabel(preference)}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Time to start",
      isValid: true,
      content: (
        <div className="choice-grid">
          {timeToStartOptions.map((timeToStart) => (
            <button
              key={timeToStart}
              type="button"
              className={answers.timeToStart === timeToStart ? "is-selected" : undefined}
              onClick={() => updateAnswers({ timeToStart })}
            >
              {formatLabel(timeToStart)}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Work authorization and resume",
      isValid: true,
      isOptional: true,
      description: "Optional placeholder",
      content: (
        <div className="stack">
          <div className="choice-grid">
            {workAuthorizationOptions.map((workAuthorization) => (
              <button
                key={workAuthorization}
                type="button"
                className={
                  answers.workAuthorization === workAuthorization ? "is-selected" : undefined
                }
                onClick={() => updateAnswers({ workAuthorization })}
              >
                {formatLabel(workAuthorization)}
              </button>
            ))}
          </div>
          <ResumeUpload
            fileName={answers.resumeFileName}
            consentAccepted={answers.resumeConsentAccepted}
            onFileNameChange={(resumeFileName) => updateAnswers({ resumeFileName })}
            onConsentChange={(resumeConsentAccepted) => updateAnswers({ resumeConsentAccepted })}
          />
        </div>
      ),
    },
  ];

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  async function submitProfile() {
    setSavingProfile(true);
    setProfileErrors([]);
    setSubmitMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload = (await response.json()) as ProfileSaveResponse;

      if (!payload.ok) {
        setProfileErrors(payload.errors);
        return;
      }

      setProfile(payload.profile);
      setSubmitMessage("Profile saved in demo mode.");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-shell">
        <header className="app-header">
          <div>
            <p className="eyebrow">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h1>Personalise My Search</h1>
          </div>
          <Link href="/">Exit</Link>
        </header>
        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>
        <QuestionStep title={currentStep.title} description={currentStep.description}>
          {currentStep.content}
        </QuestionStep>
        {profileErrors.length > 0 ? (
          <ul className="error-list">
            {profileErrors.map((error) => (
              <li key={`${error.field}-${error.message}`}>{error.message}</li>
            ))}
          </ul>
        ) : null}
        {submitMessage ? <p className="success-text">{submitMessage}</p> : null}
        <footer className="onboarding-actions">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex(stepIndex - 1)}
          >
            Back
          </button>
          {currentStep.isOptional && !isLastStep ? (
            <button type="button" onClick={() => setStepIndex(stepIndex + 1)}>
              Skip
            </button>
          ) : null}
          {currentStep.isValid ? null : (
            <span className="muted">Answer this step to continue.</span>
          )}
          {isLastStep ? (
            <button className="primary-action" type="button" onClick={submitProfile}>
              Save Profile
            </button>
          ) : (
            <button
              className="primary-action"
              type="button"
              disabled={!currentStep.isValid}
              onClick={() => setStepIndex(stepIndex + 1)}
            >
              Next
            </button>
          )}
        </footer>
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
