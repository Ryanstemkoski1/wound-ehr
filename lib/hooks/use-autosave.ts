// Autosave Hook
// Phase 9.3.2: React hook for automatic form data persistence

import { useEffect, useRef, useCallback } from "react";
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearAutosave,
  getAutosaveKey,
} from "@/lib/autosave";

export type AutosaveOptions<T> = {
  /** Unique identifier for the form type (e.g., 'visit', 'assessment') */
  formType: string;
  /** Unique identifier for the entity (e.g., patientId, visitId) */
  entityId: string;
  /** User ID for isolation */
  userId: string;
  /** Form data to autosave */
  data: T;
  /** Autosave interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Whether autosave is enabled (default: true) */
  enabled?: boolean;
  /** Callback after successful save */
  onSave?: () => void;
};

/**
 * Hook for automatic form data persistence to localStorage
 * 
 * @example
 * ```tsx
 * const { loadSavedData, clearSavedData } = useAutosave({
 *   formType: 'visit',
 *   entityId: patientId,
 *   userId: user.id,
 *   data: formData,
 *   interval: 30000, // 30 seconds
 * });
 * ```
 */
export function useAutosave<T>({
  formType,
  entityId,
  userId,
  data,
  interval = 30000, // 30 seconds default
  enabled = true,
  onSave,
}: AutosaveOptions<T>) {
  const autosaveKey = getAutosaveKey(formType, entityId, userId);
  const lastSavedRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Autosave effect
  useEffect(() => {
    if (!enabled) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up autosave interval
    intervalRef.current = setInterval(() => {
      const currentData = JSON.stringify(data);
      
      // Only save if data has changed
      if (currentData !== lastSavedRef.current) {
        saveToLocalStorage(autosaveKey, data);
        lastSavedRef.current = currentData;
        onSave?.();
      }
    }, interval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [data, enabled, interval, autosaveKey, onSave]);

  // Load saved data
  const loadSavedData = useCallback(() => {
    return loadFromLocalStorage<T>(autosaveKey);
  }, [autosaveKey]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    clearAutosave(autosaveKey);
  }, [autosaveKey]);

  // Manual save
  const saveNow = useCallback(() => {
    saveToLocalStorage(autosaveKey, data);
    lastSavedRef.current = JSON.stringify(data);
    onSave?.();
  }, [autosaveKey, data, onSave]);

  return {
    loadSavedData,
    clearSavedData,
    saveNow,
    autosaveKey,
  };
}
