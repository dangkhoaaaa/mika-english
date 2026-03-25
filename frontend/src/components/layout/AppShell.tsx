"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { clearSession, getAccessToken, getRefreshToken } from "@/lib/session";
import { WakeupPing } from "@/components/infra/WakeupPing";
import type { ReactNode } from "react";
import {
  FaHome,
  FaFileImport,
  FaBook,
  FaPlus,
  FaGamepad,
  FaBrain,
  FaCheckCircle,
  FaBolt,
  FaFish,
  FaStar,
  FaComments,
  FaTrophy,
  FaUser,
  FaSearch,
} from "react-icons/fa";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  soon?: boolean;
};

const navItems: NavItem[] = [
  { href: "/home", label: "Bảng tin", icon: <FaHome /> },
  { href: "/excel", label: "Import Excel", icon: <FaFileImport /> },
  { href: "/vocabulary", label: "Từ vựng", icon: <FaBook /> },
  { href: "/flashcards", label: "Thêm từ / Import", icon: <FaPlus /> },
  { href: "/study", label: "Học thẻ", icon: <FaGamepad /> },
  { href: "/quiz", label: "Quiz topic", icon: <FaBrain /> },
  { href: "/checkin", label: "Điểm danh", icon: <FaCheckCircle /> },
  { href: "/motivation", label: "Động lực", icon: <FaBolt /> },
  { href: "/fishing", label: "Câu cá", icon: <FaFish /> },
  { href: "/fish-collection", label: "Sưu tập cá", icon: <FaStar /> },
  { href: "/leaderboard", label: "BXH", icon: <FaTrophy /> },
  { href: "/profile", label: "Trang cá nhân", icon: <FaUser /> },
  { href: "/users", label: "Tìm user", icon: <FaSearch /> },
  { href: "/saved", label: "Từ đã lưu", icon: <FaStar /> },
  { href: "/messages", label: "Tin nhắn", icon: <FaComments />, soon: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <WakeupPing />
      {/* Top bar — Facebook-like + Netflix tone */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#141414]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-4">
          <button
            type="button"
            aria-label="Mở menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-white/10"
            onClick={() => setOpen(true)}
          >
            <span className="flex flex-col gap-1.5">
              <span className="h-0.5 w-6 rounded bg-white" />
              <span className="h-0.5 w-6 rounded bg-white" />
              <span className="h-0.5 w-6 rounded bg-white" />
            </span>
          </button>

          <Link href="/home" className="shrink-0 text-xl font-bold tracking-tight">
            <span className="text-[#E50914]">Mika</span>
            <span className="text-white"> English</span>
          </Link>

          <div className="mx-auto hidden max-w-md flex-1 sm:block">
            <div className="rounded-full bg-[#3a3a3a] px-4 py-2 text-sm text-zinc-400">
              Tìm kiếm trên Mika English…
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-white/10 pb-8 pt-4 lg:block">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.soon ? "#" : item.href}
                  onClick={(e) => item.soon && e.preventDefault()}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  } ${item.soon ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.soon ? (
                    <span className="ml-auto rounded bg-[#E50914]/20 px-1.5 text-[10px] text-[#E50914]">Soon</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-h-[calc(100vh-3.5rem)] flex-1">{children}</main>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[min(85vw,280px)] border-r border-white/10 bg-[#181818] p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-bold">
                <span className="text-[#E50914]">Mika</span> English
              </span>
              <button
                type="button"
                className="rounded p-2 hover:bg-white/10"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.soon ? "#" : item.href}
                  onClick={(e) => {
                    if (item.soon) e.preventDefault();
                    else setOpen(false);
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${
                    pathname === item.href ? "bg-white/10" : "hover:bg-white/5"
                  } ${item.soon ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                  {item.soon ? (
                    <span className="ml-auto text-[10px] text-[#E50914]">Soon</span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
