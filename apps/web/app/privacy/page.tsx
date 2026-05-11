export default function PrivacyPage() {
  return (
    <main className="policy-page">
      <section className="policy-shell">
        <p className="eyebrow">Privacy</p>
        <h1>Job Globe Privacy Notice</h1>
        <p className="policy-lede">
          This notice reflects the privacy behavior currently implemented in the repository. It is
          not a final legal policy and has not been legally reviewed.
        </p>

        <section>
          <h2>Data The App Currently Handles</h2>
          <ul>
            <li>Account identifiers from Supabase Auth and the internal users table.</li>
            <li>Profile preferences saved from onboarding.</li>
            <li>Raw resume files uploaded by authenticated users.</li>
            <li>Parsed resume text/profile data when the worker pipeline is operating.</li>
            <li>Saved jobs, application redirect records, and alert subscriptions.</li>
            <li>In-app notifications and quick-prep cache records.</li>
            <li>System audit events for sensitive user and worker actions.</li>
          </ul>
        </section>

        <section>
          <h2>Resume Handling</h2>
          <p>
            Resume upload is optional and requires authentication. Raw files are uploaded to the
            private Supabase Storage bucket named <code>resumes</code>. The app stores resume
            metadata in <code>resume_extractions</code>, returns short-lived signed URLs, and lets
            users delete the raw stored object.
          </p>
          <p>
            Raw resume retention is controlled by <code>RESUME_RAW_RETENTION_DAYS</code>, defaulting
            to 30 days. The worker code includes retention cleanup for audit events, but automated
            raw resume Storage cleanup still needs end-to-end verification.
          </p>
          <p>
            The repository includes a resume parser worker for PDF, DOCX, and text extraction, but
            the current upload-to-parser handoff needs repair before resume parsing can be treated
            as production-ready.
          </p>
        </section>

        <section>
          <h2>Current Limits</h2>
          <ul>
            <li>Structured resume parsing exists in worker code but is not currently verified end to end.</li>
            <li>
              Account export and deletion routes exist, but account deletion needs correctness fixes
              before public launch.
            </li>
            <li>Parsed-profile correction is not implemented.</li>
            <li>Alert email delivery and AI-generated quick-prep need production verification.</li>
            <li>This page is a draft notice, not a final privacy policy.</li>
          </ul>
        </section>

        <section>
          <h2>User Controls Available Now</h2>
          <ul>
            <li>Users can update onboarding/profile preferences.</li>
            <li>Users can delete the raw resume file from the profile page.</li>
            <li>Users can delete saved jobs and alerts.</li>
            <li>Authenticated users can request a JSON account export through the account API.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
