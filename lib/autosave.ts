// Autosave Utilities
// Phase 9.3.2: Client-side and server-side autosave to prevent data loss

/**
 * Generate a unique storage key for autosave data
 */
export function getAutosaveKey(
  formType: string,
  entityId: string,
  userId: string
): string {
  return `wound-ehr-autosave-${formType}-${entityId}-${userId}`;
}

/**
 * Save form data to localStorage
 */
export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    const timestamp = new Date().toISOString();
    const payload = {
      data,
      timestamp,
      version: "1.0",
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

/**
 * Load form data from localStorage
 */
export function loadFromLocalStorage<T>(key: string): {
  data: T | null;
  timestamp: string | null;
} {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return { data: null, timestamp: null };

    const payload = JSON.parse(stored);
    return {
      data: payload.data as T,
      timestamp: payload.timestamp,
    };
  } catch (error) {
    console.error("Failed to load from localStorage:", error);
    return { data: null, timestamp: null };
  }
}

/**
 * Clear autosave data from localStorage
 */
export function clearAutosave(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear autosave:", error);
  }
}

/**
 * Check if there's recent autosave data (within last 24 hours)
 */
export function hasRecentAutosave(key: string): boolean {
  const { timestamp } = loadFromLocalStorage(key);
  if (!timestamp) return false;

  const savedTime = new Date(timestamp).getTime();
  const now = new Date().getTime();
  const hoursDiff = (now - savedTime) / (1000 * 60 * 60);

  return hoursDiff < 24; // Consider recent if less than 24 hours old
}

/**
 * Get all autosave keys for a user
 */
export function getUserAutosaveKeys(userId: string): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`wound-ehr-autosave-`) && key.includes(userId)) {
        keys.push(key);
      }
    }
  } catch (error) {
    console.error("Failed to get autosave keys:", error);
  }
  return keys;
}

/**
 * Format timestamp for display
 */
export function formatAutosaveTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  return date.toLocaleString();
}
