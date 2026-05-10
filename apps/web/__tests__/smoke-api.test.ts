/**
 * API smoke tests.
 *
 * These tests verify the observable contract of each key API route:
 * correct HTTP status codes, expected JSON fields, and auth guard
 * behaviour. Supabase and the database are fully mocked — no live
 * connections are made.
 *
 * Run with: npm run test --workspace=apps/web
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();
const mockSupabaseClient = {
  from: mockFrom,
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  },
  storage: {
    listBuckets: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
};

vi.mock("../lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockSupabaseClient,
  getSupabaseConfigStatus: () => ({ configured: true, missing: [] }),
}));

vi.mock("../lib/supabase/auth", () => ({
  resolveRequestUser: vi.fn().mockResolvedValue(null), // default: unauthenticated
}));

// ── Helper ────────────────────────────────────────────────────────────────────

function makeRequest(url: string, options: RequestInit = {}): Request {
  return new Request(`http://localhost:3000${url}`, options);
}

// ── /api/health ───────────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  beforeEach(() => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ error: null, count: 200 }),
      }),
    });
  });

  it("returns 200 with ok status and required check names", async () => {
    // Dynamic import so mocks are applied before the module initialises.
    const { GET } = await import("../app/api/health/route");
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("job-globe-web");
    expect(typeof body.checkedAt).toBe("string");
    expect(Array.isArray(body.checks)).toBe(true);

    const checkNames = (body.checks as Array<{ name: string }>).map((c) => c.name);
    expect(checkNames).toContain("environment");
    expect(checkNames).toContain("supabase.jobs");
    expect(checkNames).toContain("supabase.migrations");
  });

  it("check objects have name and status fields", async () => {
    const { GET } = await import("../app/api/health/route");
    const response = await GET();
    const body = await response.json();

    for (const check of body.checks as Array<{ name: string; status: string }>) {
      expect(typeof check.name).toBe("string");
      expect(["ok", "error"]).toContain(check.status);
    }
  });
});

// ── /api/auth/session ─────────────────────────────────────────────────────────

describe("GET /api/auth/session", () => {
  it("returns authenticated:false for unauthenticated request", async () => {
    const { GET } = await import("../app/api/auth/session/route");
    const request = makeRequest("/api/auth/session");
    const response = await GET(request as never);
    const body = await response.json();

    expect(typeof body.authenticated).toBe("boolean");
    // unauthenticated — resolveRequestUser returns null
    expect(body.authenticated).toBe(false);
  });

  it("response includes authenticated field", async () => {
    const { GET } = await import("../app/api/auth/session/route");
    const request = makeRequest("/api/auth/session");
    const response = await GET(request as never);
    const body = await response.json();

    expect("authenticated" in body).toBe(true);
  });
});

// ── /api/alerts ── auth guard ─────────────────────────────────────────────────

describe("GET /api/alerts — auth guard", () => {
  it("returns 401 for unauthenticated request", async () => {
    const { GET } = await import("../app/api/alerts/route");
    const request = makeRequest("/api/alerts");
    const response = await GET(request as never);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });
});

describe("POST /api/alerts — auth guard", () => {
  it("returns 401 for unauthenticated request", async () => {
    const { POST } = await import("../app/api/alerts/route");
    const request = makeRequest("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/alerts — auth guard", () => {
  it("returns 401 for unauthenticated request", async () => {
    const { DELETE } = await import("../app/api/alerts/route");
    const request = makeRequest("/api/alerts?id=abc");
    const response = await DELETE(request as never);
    expect(response.status).toBe(401);
  });
});

// ── /api/applications ── auth guard ──────────────────────────────────────────

describe("GET /api/applications — auth guard", () => {
  it("returns 401 for unauthenticated request", async () => {
    const { GET } = await import("../app/api/applications/route");
    const request = makeRequest("/api/applications");
    const response = await GET(request as never);
    expect(response.status).toBe(401);
  });
});

describe("POST /api/applications — auth guard", () => {
  it("returns 401 for unauthenticated request", async () => {
    const { POST } = await import("../app/api/applications/route");
    const request = makeRequest("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: "abc", apply_url: "https://example.com/apply" }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(401);
  });
});

// ── /api/profile ── auth guard ────────────────────────────────────────────────

describe("GET /api/profile — auth guard", () => {
  it("returns 401 for unauthenticated request", async () => {
    const { GET } = await import("../app/api/profile/route");
    const request = makeRequest("/api/profile");
    const response = await GET(request as never);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });
});

describe("POST /api/profile — auth guard", () => {
  it("returns 401 for unauthenticated request", async () => {
    const { POST } = await import("../app/api/profile/route");
    const request = makeRequest("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: {} }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(401);
  });
});

// ── /api/saved-jobs ── auth guard ─────────────────────────────────────────────

describe("GET /api/saved-jobs — auth guard", () => {
  it("returns 401 for unauthenticated request", async () => {
    const { GET } = await import("../app/api/saved-jobs/route");
    const request = makeRequest("/api/saved-jobs");
    const response = await GET(request as never);
    expect(response.status).toBe(401);
  });
});

// ── /api/alerts ── validation ─────────────────────────────────────────────────

describe("POST /api/alerts — input validation", () => {
  beforeEach(async () => {
    // Re-mock resolveRequestUser as authenticated for these tests
    const authMod = await import("../lib/supabase/auth");
    vi.mocked(authMod.resolveRequestUser).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    } as never);
  });

  it("returns 400 when name is missing", async () => {
    const { POST } = await import("../app/api/alerts/route");
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ count: 0, error: null }) }) }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: { message: "err" } }) }) }),
    });

    const request = makeRequest("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: {}, delivery_channels: ["in_app"] }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("name");
  });

  it("returns 400 when name is empty string", async () => {
    const { POST } = await import("../app/api/alerts/route");
    const request = makeRequest("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "   ", query: {} }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(400);
  });
});

// ── /api/applications ── validation ──────────────────────────────────────────

describe("POST /api/applications — input validation", () => {
  beforeEach(async () => {
    const authMod = await import("../lib/supabase/auth");
    vi.mocked(authMod.resolveRequestUser).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
    } as never);
  });

  it("returns 400 when job_id is missing", async () => {
    const { POST } = await import("../app/api/applications/route");
    const request = makeRequest("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apply_url: "https://example.com/apply" }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("job_id");
  });

  it("returns 400 when apply_url is not a valid URL", async () => {
    const { POST } = await import("../app/api/applications/route");
    const request = makeRequest("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: "abc", apply_url: "not-a-url" }),
    });
    const response = await POST(request as never);
    expect(response.status).toBe(400);
  });
});
