// Factories for synthetic test records. All data here is fake.

import type { UserRoleData } from "@/lib/rbac";
import type { FakeAuthUser } from "./supabase";

export const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
export const TEST_TENANT_ID = "00000000-0000-4000-8000-0000000000a1";
export const TEST_FACILITY_ID = "00000000-0000-4000-8000-0000000000f1";
export const OTHER_FACILITY_ID = "00000000-0000-4000-8000-0000000000f2";

export function makeAuthUser(
  overrides: Partial<FakeAuthUser> = {}
): FakeAuthUser {
  return {
    id: TEST_USER_ID,
    email: "clinician@example.test",
    user_metadata: {},
    ...overrides,
  };
}

export function makeUserRole(
  overrides: Partial<UserRoleData> = {}
): UserRoleData {
  return {
    id: "00000000-0000-4000-8000-0000000000r1",
    user_id: TEST_USER_ID,
    tenant_id: TEST_TENANT_ID,
    role: "user",
    facility_id: TEST_FACILITY_ID,
    created_at: "2026-01-05T09:00:00.000Z",
    ...overrides,
  };
}
