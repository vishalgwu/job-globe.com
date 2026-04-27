"use client";

import type { ReactNode } from "react";

interface QuestionStepProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function QuestionStep({ title, description, children }: QuestionStepProps) {
  return (
    <section className="question-step" aria-labelledby="question-step-title">
      <div>
        <h2 id="question-step-title">{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
