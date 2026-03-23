"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAccessToken } from "@/lib/session";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#141414] text-zinc-500">
      Đang chuyển hướng…
    </div>
  );
}
