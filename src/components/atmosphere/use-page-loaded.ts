"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("load", onChange);
  return () => window.removeEventListener("load", onChange);
}

/**
 * Whether the page itself has finished loading. The loops and the fox wait for it, so they never
 * take the line from the painting and the words the guest came to see.
 */
export function usePageLoaded() {
  return useSyncExternalStore(
    subscribe,
    () => document.readyState === "complete",
    () => false,
  );
}
