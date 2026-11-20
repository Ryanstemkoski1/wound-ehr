// Global test setup.
//
// Server code talks to Supabase through `@/lib/supabase/server` (and the
// service-role client in `@/lib/supabase/service`). Both are replaced here
// with the in-memory fake from `tests/helpers/supabase.ts`, so no test ever
// reaches a real database. Next.js request APIs are stubbed the same way.

import { afterEach, beforeEach, vi } from "vitest";
import { getFakeSupabase, resetFakeSupabase } from "./helpers/supabase";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => getFakeSupabase().client),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => getFakeSupabase().client),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    get: () => undefined,
    set: vi.fn(),
  })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";

beforeEach(() => {
  resetFakeSupabase();
});

afterEach(() => {
  vi.useRealTimers();
});
