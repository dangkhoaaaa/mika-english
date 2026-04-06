"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAccessToken } from "@/lib/session";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/quick-start");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--mika-bg-page)] text-[var(--mika-fg-muted)]">
      Đang chuyển hướng…
    </div>
  );
}
