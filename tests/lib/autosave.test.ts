import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import {
  clearAllUserAutosaveData,
  clearAutosave,
  formatAutosaveTime,
  getAutosaveKey,
  getUserAutosaveKeys,
  hasRecentAutosave,
  loadFromLocalStorage,
  saveToLocalStorage,
} from "@/lib/autosave";

/** Minimal in-memory implementation of the Web Storage API. */
class MemoryStorage {
  private items = new Map<string, string>();

  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
}

const USER_A = "00000000-0000-4000-8000-00000000000a";
const USER_B = "00000000-0000-4000-8000-00000000000b";
const VISIT_ID = "00000000-0000-4000-8000-0000000000c1";
const SAVED_AT = new Date("2026-04-10T08:00:00.000Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

let storage: MemoryStorage;
let consoleError: MockInstance<typeof console.error>;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.useFakeTimers();
  vi.setSystemTime(SAVED_AT);
});

describe("getAutosaveKey", () => {
  it("namespaces drafts by form, entity and user", () => {
    expect(getAutosaveKey("visit", VISIT_ID, USER_A)).toBe(
      `wound-ehr-autosave-visit-${VISIT_ID}-${USER_A}`
    );
  });
});

describe("saveToLocalStorage / loadFromLocalStorage", () => {
  const key = getAutosaveKey("visit", VISIT_ID, USER_A);
  const draft = { notes: "Synthetic draft", woundCount: 2, signed: false };

  it("stores the data with an ISO timestamp and format version", () => {
    saveToLocalStorage(key, draft);

    expect(JSON.parse(storage.getItem(key) ?? "")).toEqual({
      data: draft,
      timestamp: "2026-04-10T08:00:00.000Z",
      version: "1.0",
    });
  });

  it("round-trips the saved draft and its timestamp", () => {
    saveToLocalStorage(key, draft);
    expect(loadFromLocalStorage<typeof draft>(key)).toEqual({
      data: draft,
      timestamp: "2026-04-10T08:00:00.000Z",
    });
  });

  it("overwrites an earlier draft with the latest one", () => {
    saveToLocalStorage(key, { notes: "first" });
    vi.advanceTimersByTime(30_000);
    saveToLocalStorage(key, { notes: "second" });

    expect(loadFromLocalStorage(key)).toEqual({
      data: { notes: "second" },
      timestamp: "2026-04-10T08:00:30.000Z",
    });
  });

  it("returns nulls when nothing has been saved or the entry is corrupted", () => {
    expect(loadFromLocalStorage(key)).toEqual({ data: null, timestamp: null });

    storage.setItem(key, "{not json");
    expect(loadFromLocalStorage(key)).toEqual({ data: null, timestamp: null });
    expect(consoleError).toHaveBeenCalled();
  });

  it("swallows storage errors such as an exceeded quota", () => {
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => saveToLocalStorage(key, draft)).not.toThrow();
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to save to localStorage:",
      expect.any(Error)
    );
  });
});

describe("clearAutosave", () => {
  it("removes only the given draft", () => {
    const visitKey = getAutosaveKey("visit", VISIT_ID, USER_A);
    const assessmentKey = getAutosaveKey("assessment", VISIT_ID, USER_A);
    saveToLocalStorage(visitKey, { a: 1 });
    saveToLocalStorage(assessmentKey, { b: 2 });

    clearAutosave(visitKey);

    expect(storage.getItem(visitKey)).toBeNull();
    expect(storage.getItem(assessmentKey)).not.toBeNull();
  });
});

describe("hasRecentAutosave", () => {
  const key = getAutosaveKey("visit", VISIT_ID, USER_A);

  it("is false when there is no readable draft", () => {
    expect(hasRecentAutosave(key)).toBe(false);
    storage.setItem(key, "garbage");
    expect(hasRecentAutosave(key)).toBe(false);
  });

  it.each([
    ["immediately after saving", 0, true],
    ["one minute before the 24-hour cutoff", 24 * HOUR - MINUTE, true],
    ["exactly 24 hours later", 24 * HOUR, false],
  ])("is %s -> %s", (_when, elapsedMs, expected) => {
    saveToLocalStorage(key, { notes: "draft" });
    vi.advanceTimersByTime(elapsedMs);
    expect(hasRecentAutosave(key)).toBe(expected);
  });
});

describe("getUserAutosaveKeys / clearAllUserAutosaveData", () => {
  const userAVisit = getAutosaveKey("visit", VISIT_ID, USER_A);
  const userAAssessment = getAutosaveKey("assessment", VISIT_ID, USER_A);
  const userBVisit = getAutosaveKey("visit", VISIT_ID, USER_B);

  beforeEach(() => {
    saveToLocalStorage(userAVisit, { notes: "a1" });
    saveToLocalStorage(userAAssessment, { notes: "a2" });
    saveToLocalStorage(userBVisit, { notes: "b1" });
    storage.setItem("theme", "dark");
    // Not an autosave entry, even though it mentions the user id.
    storage.setItem(`recent-patients-${USER_A}`, "[]");
  });

  it("lists only autosave entries belonging to the user", () => {
    expect(getUserAutosaveKeys(USER_A).sort()).toEqual(
      [userAAssessment, userAVisit].sort()
    );
  });

  it("on logout removes every draft of that user and nothing else", () => {
    clearAllUserAutosaveData(USER_A);

    expect(storage.getItem(userAVisit)).toBeNull();
    expect(storage.getItem(userAAssessment)).toBeNull();
    expect(storage.getItem(userBVisit)).not.toBeNull();
    expect(storage.getItem("theme")).toBe("dark");
    expect(storage.getItem(`recent-patients-${USER_A}`)).toBe("[]");
  });

  it("degrades to empty results, without throwing, when storage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadFromLocalStorage(userAVisit)).toEqual({
      data: null,
      timestamp: null,
    });
    expect(hasRecentAutosave(userAVisit)).toBe(false);
    expect(getUserAutosaveKeys(USER_A)).toEqual([]);
    expect(() => clearAllUserAutosaveData(USER_A)).not.toThrow();
    expect(() => clearAutosave(USER_A)).not.toThrow();
  });
});

describe("formatAutosaveTime", () => {
  const savedAt = SAVED_AT.toISOString();

  it.each([
    [59_999, "just now"],
    [MINUTE, "1 minute ago"],
    [2 * MINUTE, "2 minutes ago"],
    [59 * MINUTE + 59_999, "59 minutes ago"],
    [HOUR, "1 hour ago"],
    [2 * HOUR, "2 hours ago"],
    [24 * HOUR - 1, "23 hours ago"],
  ])("formats a draft saved %i ms ago as %j", (elapsedMs, expected) => {
    vi.advanceTimersByTime(elapsedMs);
    expect(formatAutosaveTime(savedAt)).toBe(expected);
  });

  it("shows the absolute local date and time once a draft is a day old", () => {
    vi.advanceTimersByTime(24 * HOUR);
    expect(formatAutosaveTime(savedAt)).toBe(SAVED_AT.toLocaleString());
  });

  it("treats a timestamp slightly in the future (clock skew) as just now", () => {
    expect(formatAutosaveTime("2026-04-10T08:05:00.000Z")).toBe("just now");
  });
});
