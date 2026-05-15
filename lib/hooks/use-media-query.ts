"use client";

import { useState, useEffect } from "react";

/**
 * Hook that tracks a CSS media query match.
 * Returns `false` during SSR and on the first client render to avoid
 * hydration mismatches, then updates on mount and on viewport changes.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** True when viewport is < 768px (mobile phones) */
export function useMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/** True when viewport is < 1024px (tablets and phones) */
export function useTabletOrMobile(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}

/** True when the device supports coarse pointer (touch) */
export function useTouchDevice(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
