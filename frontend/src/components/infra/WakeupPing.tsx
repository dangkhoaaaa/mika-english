"use client";

import { useEffect, useRef } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function WakeupPing() {
  const lastPingRef = useRef(0);

  useEffect(() => {
    const ping = () => {
      const now = Date.now();
      // giảm spam: tối đa 1 lần / 45 giây
      if (now - lastPingRef.current < 45_000) return;
      lastPingRef.current = now;
      fetch(`${API_BASE_URL}/api/v1/wakeup`, { method: "GET", cache: "no-store" }).catch(() => {
        // ignore wake-up error
      });
    };

    // ping ngay khi mount
    ping();

    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    const onFocus = () => ping();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}

