import { useEffect } from "react";

type Sentinel = { release: () => Promise<void> };

/** Keeps the screen awake while `active` is true. Re-acquires after returning to the tab. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;
    const wl = (navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<Sentinel> };
    }).wakeLock;
    if (!wl) return;
    let sentinel: Sentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const s = await wl.request("screen");
        if (cancelled) void s.release();
        else sentinel = s;
      } catch {
        /* not allowed (low battery etc.) */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
