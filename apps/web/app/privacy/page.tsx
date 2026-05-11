export default function PrivacyPage() {
  return (
    <main className="policy-page">
      <section className="policy-shell">
        <p className="eyebrow">Privacy</p>
        <h1>Job Globe Privacy Notice</h1>
        <p className="policy-lede">
          This notice reflects the privacy behavior currently implemented in the repository. It is
          not a final legal policy.
        </p>

        <section>
          <h2>Data The App Currently Handles</h2>
          <ul>
            <li>Account identifiers from Supabase Auth and the internal users table.</li>
            <li>Profile preferences saved from onboarding.</li>
            <li>Raw resume files uploaded by authenticated users.</li>
            <li>Saved jobs, application redirect records, and alert subscriptions.</li>
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
            to 30 days. Automated deletion after that deadline is not implemented yet.
          </p>
        </section>

        <section>
          <h2>Current Limits</h2>
          <ul>
            <li>PDF/DOCX parsing and structured resume extraction are not implemented.</li>
            <li>
              Account deletion, data export, and parsed-profile correction are not implemented.
            </li>
            <li>Alert delivery and generated AI matching content are not implemented.</li>
          </ul>
        </section>

        <section>
          <h2>User Controls Available Now</h2>
          <ul>
            <li>Users can update onboarding/profile preferences.</li>
            <li>Users can delete the raw resume file from the profile page.</li>
            <li>Users can delete saved jobs and alerts.</li>
          </ul>
        </section>
      </section>
    </main>
  );
}
