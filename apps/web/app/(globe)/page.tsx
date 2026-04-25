import { GlobeCanvas } from "../../components/globe/GlobeCanvas/GlobeCanvas";
import { JobPanel } from "../../components/job-panel/JobPanel/JobPanel";

export default function GlobePage() {
  return (
    <main style={{ display: "grid", minHeight: "100vh", gridTemplateColumns: "1fr 380px" }}>
      <GlobeCanvas />
      <JobPanel />
    </main>
  );
}
