/**
 * Controllable Supabase auth mock for middleware integration tests.
 *
 * Usage:
 *   setAuthUser({ id: "u1", email: "a@b.com" })   // authenticated
 *   setAuthUser(null)                                // unauthenticated
 */
import { vi } from "vitest";

type MockUser = { id: string; email: string } | null;

let _currentUser: MockUser = null;

export function setAuthUser(user: MockUser) {
  _currentUser = user;
}

export function resetAuthUser() {
  _currentUser = null;
}

/** The mock Supabase client returned by createServerClient */
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: _currentUser },
      error: null,
    })),
  },
};
