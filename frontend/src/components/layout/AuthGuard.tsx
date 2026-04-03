"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || "/home")}`);
      return;
    }
    setAuthToken(token);
    const t = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(t);
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--mika-bg-page)] text-[var(--mika-fg-muted)]">
        Đang kiểm tra…
      </div>
    );
  }

  return <>{children}</>;
}
