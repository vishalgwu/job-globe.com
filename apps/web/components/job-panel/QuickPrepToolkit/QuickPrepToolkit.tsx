import type { QuickPrepPlaceholder } from "@job-globe/shared-types";

interface QuickPrepToolkitProps {
  quickPrep: QuickPrepPlaceholder;
}

export function QuickPrepToolkit({ quickPrep }: QuickPrepToolkitProps) {
  return (
    <section className="quick-prep" aria-labelledby="quick-prep-title">
      <h3 id="quick-prep-title">Quick Prep</h3>
      <details open>
        <summary>Role summary</summary>
        <p>{quickPrep.roleSummary}</p>
      </details>
      <details>
        <summary>Skills</summary>
        <p>
          <strong>Have:</strong> {quickPrep.skillsIHave.join(", ")}
        </p>
        <p>
          <strong>Missing:</strong> {quickPrep.skillsMissing.join(", ")}
        </p>
      </details>
      <details>
        <summary>Interview questions</summary>
        <ul>
          {quickPrep.interviewQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </details>
      <details>
        <summary>Company brief</summary>
        <p>{quickPrep.companyBrief}</p>
      </details>
      <details>
        <summary>Resume note</summary>
        <p>{quickPrep.resumeTailoringNote}</p>
      </details>
    </section>
  );
}
