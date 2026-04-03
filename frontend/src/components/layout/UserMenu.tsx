"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { clearSession, getAccessToken, getRefreshToken } from "@/lib/session";
import { FaBell, FaCog, FaSignOutAlt, FaUserEdit } from "react-icons/fa";
import { useTheme } from "@/components/theme/ThemeProvider";

type MiniUser = {
  displayName?: string;
  avatarUrl?: string;
};

export function UserMenu() {
  const { theme } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<MiniUser | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    void api
      .get<{ user?: MiniUser }>("/api/v1/profile/me")
      .then((res) => setUser(res.data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const logout = async () => {
    const refresh = getRefreshToken();
    const access = getAccessToken();
    setAuthToken(access);
    try {
      if (refresh) await api.post("/api/v1/auth/logout", { refreshToken: refresh });
    } catch {
      /* ignore */
    }
    clearSession();
    setAuthToken(undefined);
    router.replace("/login");
  };

  const initial = (user?.displayName || "U").trim().slice(0, 1).toUpperCase();

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border hover:opacity-95 ${
          theme === "light"
            ? "border-zinc-300 bg-white hover:bg-zinc-50"
            : "border-[color:var(--mika-border-strong)] bg-zinc-800 hover:bg-zinc-700"
        }`}
        onClick={() => setOpen((o) => !o)}
      >
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-[var(--mika-fg)]">
            {initial}
          </span>
        )}
      </button>

      {open ? (
        <div
          className={`absolute right-0 z-50 mt-1 w-56 rounded-xl border py-1 shadow-xl ${
            theme === "light" ? "border-zinc-200 bg-white" : "border-[color:var(--mika-border)] bg-[var(--mika-surface)]"
          }`}
        >
          <div className={`border-b px-3 py-2 ${theme === "light" ? "border-zinc-200" : "border-[color:var(--mika-border)]"}`}>
            <p className="truncate text-sm font-semibold text-[var(--mika-fg)]">
              {user?.displayName || "Tài khoản"}
            </p>
          </div>
          <button
            type="button"
            disabled
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--mika-fg-muted)]"
          >
            <FaBell className="shrink-0 opacity-70" />
            Thông báo
            <span className="ml-auto text-[10px] text-[var(--mika-fg-subtle)]">Soon</span>
          </button>
          <Link
            href="/profile"
            className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 ${
              theme === "light" ? "text-zinc-800 hover:bg-zinc-100" : "text-[var(--mika-fg)] hover:bg-white/5"
            }`}
            onClick={() => setOpen(false)}
          >
            <FaUserEdit className="shrink-0" />
            Cài đặt trang cá nhân
          </Link>
          <Link
            href="/settings"
            className={`flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 ${
              theme === "light" ? "text-zinc-800 hover:bg-zinc-100" : "text-[var(--mika-fg)] hover:bg-white/5"
            }`}
            onClick={() => setOpen(false)}
          >
            <FaCog className="shrink-0" />
            Cài đặt
          </Link>
                    <button
            type="button"
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 ${
              theme === "light" ? "text-red-700 hover:bg-red-50" : "text-red-300 hover:bg-white/5"
            }`}
            onClick={() => void logout()}
          >
            <FaSignOutAlt className="shrink-0" />
            Đăng xuất
          </button>
        </div>
      ) : null}
    </div>
  );
}
