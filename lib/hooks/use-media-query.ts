"use client";

import { useState, useEffect } from "react";

/**
 * Hook that tracks a CSS media query match.
 * Returns `false` during SSR, then reads the real value on the client via
 * a lazy useState initializer. Future changes are handled by the event
 * listener. When the query prop itself changes the effect re-subscribes
 * automatically; the displayed value may lag by one render for query changes,
 * which is acceptable for media-query breakpoint tracking.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
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
