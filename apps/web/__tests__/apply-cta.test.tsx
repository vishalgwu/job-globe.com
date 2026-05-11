import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplyCTA } from "../components/job-panel/ApplyCTA/ApplyCTA";

describe("ApplyCTA", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("records the application before opening the official apply URL", async () => {
    const events: string[] = [];
    const applyUrl = "https://jobs.example.com/apply/123";

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        events.push("record");
        return new Response(JSON.stringify({ ok: true }), { status: 201 });
      }),
    );

    const openMock = vi.fn(() => {
      events.push("open");
      return {} as Window;
    });
    vi.spyOn(window, "open").mockImplementation(openMock);

    render(<ApplyCTA applyUrl={applyUrl} jobId="00000000-0000-0000-0000-000000000001" />);

    fireEvent.click(screen.getByRole("link", { name: /apply on official site/i }));

    await waitFor(() => {
      expect(openMock).toHaveBeenCalledWith(applyUrl, "_blank", "noopener,noreferrer");
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/applications",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          job_id: "00000000-0000-0000-0000-000000000001",
          apply_url: applyUrl,
        }),
      }),
    );
    expect(events).toEqual(["record", "open"]);
  });

  it("does not render an apply link for unsafe URLs", () => {
    render(<ApplyCTA applyUrl="http://localhost:3000/apply" jobId="job-id" />);

    expect(screen.queryByRole("link", { name: /apply on official site/i })).toBeNull();
    expect(screen.getByText(/apply link is unavailable/i)).toBeTruthy();
  });
});
