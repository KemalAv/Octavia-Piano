import { useEffect, useRef } from "react";

/**
 * Custom hook to prevent device screen from turning off (sleep/lock)
 * while a gameplay session is active (both manual playing and autoplay mode).
 *
 * Uses the standard Screen Wake Lock API (`navigator.wakeLock`).
 * - Automatically requests wake lock when `enabled` is true.
 * - Automatically releases wake lock when `enabled` is false, unmounted, or game paused/ended.
 * - Automatically re-requests wake lock on `visibilitychange` when returning from another tab.
 */
export function useWakeLock(enabled: boolean): void {
  const wakeLockRef = useRef<any>(null);
  const isEnabledRef = useRef(enabled);
  isEnabledRef.current = enabled;

  useEffect(() => {
    let isCancelled = false;

    const requestLock = async () => {
      if (!isEnabledRef.current) return;
      if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      try {
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          const lock = await (navigator as any).wakeLock.request("screen");
          if (isCancelled || !isEnabledRef.current) {
            lock.release().catch(() => {});
            return;
          }
          wakeLockRef.current = lock;
          lock.addEventListener("release", () => {
            if (wakeLockRef.current === lock) {
              wakeLockRef.current = null;
            }
          });
        }
      } catch (err) {
        // Can fail if low battery, system policy, or window inactive; safely catch
      }
    };

    const releaseLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch (err) {}
        wakeLockRef.current = null;
      }
    };

    if (enabled) {
      requestLock();
    } else {
      releaseLock();
    }

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible" && isEnabledRef.current) {
        requestLock();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isCancelled = true;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      releaseLock();
    };
  }, [enabled]);
}
