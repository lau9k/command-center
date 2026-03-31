import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  setAuthUser,
  resetAuthUser,
  mockSupabaseClient,
} from "../mocks/supabase";
import { validateApiKey } from "@/lib/api-auth";

// Mock @supabase/ssr at the top level so Vitest hoists it correctly.
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

// Now safe to import — it will pick up the mocked createServerClient.
import { updateSession } from "@/lib/supabase/middleware";

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

// ─── Middleware auth tests ────────────────────────────────────────

describe("middleware – updateSession", () => {
  beforeEach(() => {
    resetAuthUser();
  });

  it("redirects unauthenticated requests to /login with redirectTo", async () => {
    setAuthUser(null);

    const res = await updateSession(makeRequest("/dashboard"));

    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    const url = new URL(location);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirectTo")).toBe("/dashboard");
  });

  it("allows authenticated requests to pass through", async () => {
    setAuthUser({ id: "user-1", email: "user@test.com" });

    const res = await updateSession(makeRequest("/dashboard"));

    // Should NOT be a redirect – 200 means the request passes through.
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users away from /login to /", async () => {
    setAuthUser({ id: "user-1", email: "user@test.com" });

    const res = await updateSession(makeRequest("/login"));

    expect(res.status).toBe(307);
    const url = new URL(res.headers.get("location")!);
    expect(url.pathname).toBe("/");
  });

  describe("public routes are accessible without auth", () => {
    const publicPaths = ["/login", "/callback", "/auth/callback", "/auth/sign-out"];

    for (const path of publicPaths) {
      it(`allows unauthenticated access to ${path}`, async () => {
        setAuthUser(null);

        const res = await updateSession(makeRequest(path));

        // Public paths should pass through without redirect.
        expect(res.status).toBe(200);
        expect(res.headers.get("location")).toBeNull();
      });
    }
  });
});

// ─── API auth tests ──────────────────────────────────────────────

describe("API authentication – validateApiKey", () => {
  const API_KEY = "sk-test-key-123";

  beforeEach(() => {
    process.env.DASHBOARD_API_KEY = API_KEY;
  });

  it("returns false (401 scenario) without Authorization header", () => {
    const req = new Request("http://localhost:3000/api/contacts");
    expect(validateApiKey(req)).toBe(false);
  });

  it("returns false for non-Bearer scheme", () => {
    const req = new Request("http://localhost:3000/api/contacts", {
      headers: { authorization: `Basic ${API_KEY}` },
    });
    expect(validateApiKey(req)).toBe(false);
  });

  it("returns false for wrong token", () => {
    const req = new Request("http://localhost:3000/api/contacts", {
      headers: { authorization: "Bearer wrong-key" },
    });
    expect(validateApiKey(req)).toBe(false);
  });

  it("returns false when DASHBOARD_API_KEY is not set", () => {
    delete process.env.DASHBOARD_API_KEY;
    const req = new Request("http://localhost:3000/api/contacts", {
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    expect(validateApiKey(req)).toBe(false);
  });

  it("returns true for valid Bearer token", () => {
    const req = new Request("http://localhost:3000/api/contacts", {
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    expect(validateApiKey(req)).toBe(true);
  });
});
