"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { WakeupPing } from "@/components/infra/WakeupPing";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
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
  FaShoppingCart,
} from "react-icons/fa";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  soon?: boolean;
};

const navItems: NavItem[] = [
  { href: "/home", label: "Bảng tin", icon: <FaHome /> },
  { href: "/excel", label: "Kho excel", icon: <FaFileImport /> },
  { href: "/vocabulary", label: "Từ vựng", icon: <FaBook /> },
  { href: "/flashcards", label: "Thêm từ / Import", icon: <FaPlus /> },
  { href: "/study", label: "Học thẻ", icon: <FaGamepad /> },
  { href: "/quiz", label: "Quiz topic", icon: <FaBrain /> },
  { href: "/checkin", label: "Điểm danh", icon: <FaCheckCircle /> },
  { href: "/motivation", label: "Động lực", icon: <FaBolt /> },
  { href: "/fishing", label: "Câu cá", icon: <FaFish /> },
  { href: "/fish-collection", label: "Sưu tập cá", icon: <FaStar /> },
  { href: "/shop", label: "Shop dụng cụ", icon: <FaShoppingCart /> },
  { href: "/leaderboard", label: "BXH", icon: <FaTrophy /> },
  { href: "/profile", label: "Trang cá nhân", icon: <FaUser /> },
  { href: "/users", label: "Tìm user", icon: <FaSearch /> },
  { href: "/saved", label: "Từ đã lưu", icon: <FaStar /> },
  { href: "/messages", label: "Tin nhắn", icon: <FaComments />, soon: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [coins, setCoins] = useState<number>(0);
  const isLight = theme === "light";

  const refreshCoins = async () => {
    const access = getAccessToken();
    if (!access) return;
    setAuthToken(access);
    try {
      const res = await api.get("/api/v1/stats/me");
      const c = Number(res.data?.coins ?? 0);
      setCoins(Number.isFinite(c) ? c : 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refreshCoins();
    const onUpdate = () => void refreshCoins();
    window.addEventListener("coins:update", onUpdate);
    return () => window.removeEventListener("coins:update", onUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`min-h-screen ${isLight ? "bg-zinc-200 text-zinc-900" : "bg-[var(--mika-bg-page)] text-[var(--mika-fg)]"}`}
    >
      <WakeupPing />
      {/* Top bar — Facebook-like + Netflix tone */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur ${
          isLight ? "border-zinc-200 bg-white/95" : "border-[color:var(--mika-border)] bg-[var(--mika-bg-page)]/95"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-4">
          <button
            type="button"
            aria-label="Mở menu"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              isLight ? "hover:bg-zinc-200" : "hover:bg-white/10"
            }`}
            onClick={() => setOpen(true)}
          >
            <span className="flex flex-col gap-1.5">
              <span className={`h-0.5 w-6 rounded ${isLight ? "bg-zinc-800" : "bg-white"}`} />
              <span className={`h-0.5 w-6 rounded ${isLight ? "bg-zinc-800" : "bg-white"}`} />
              <span className={`h-0.5 w-6 rounded ${isLight ? "bg-zinc-800" : "bg-white"}`} />
            </span>
          </button>

          <Link href="/home" className="shrink-0 text-xl font-bold tracking-tight lg:mr-auto">
            <span className="text-[#E50914]">Mika</span>
            <span className={isLight ? "text-zinc-900" : "text-[var(--mika-fg)]"}> English</span>
          </Link>

          <div className="mx-auto hidden max-w-md flex-1 sm:block">
            <div
              className={`rounded-full px-4 py-2 text-sm ${
                isLight ? "bg-zinc-200 text-zinc-500" : "bg-[var(--mika-input)] text-[var(--mika-fg-muted)]"
              }`}
            >
              Tìm kiếm trên Mika English…
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`rounded-full border px-3 py-1 text-sm ${
                isLight
                  ? "border-amber-300/80 bg-amber-50 text-amber-900"
                  : "border-yellow-400/30 bg-yellow-950/30 text-yellow-200"
              }`}
            >
              💰 {coins}
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside
          className={`hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 border-r pb-8 pt-4 lg:sticky lg:top-14 lg:block lg:overflow-y-auto ${
            isLight ? "border-zinc-200 bg-zinc-100" : "border-[color:var(--mika-border)] bg-[var(--mika-bg-page)]"
          }`}
        >
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.soon ? "#" : item.href}
                  onClick={(e) => item.soon && e.preventDefault()}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] transition ${
                    active
                      ? isLight
                        ? "bg-zinc-200 text-zinc-900"
                        : "bg-white/10 text-[var(--mika-fg)]"
                      : isLight
                        ? "text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900"
                        : "text-[var(--mika-fg-muted)] hover:bg-white/5 hover:text-[var(--mika-fg)]"
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
          <div
            className={`absolute left-0 top-0 h-full w-[min(85vw,280px)] border-r p-4 shadow-xl ${
              isLight ? "border-zinc-200 bg-white text-zinc-900" : "border-[color:var(--mika-border)] bg-[var(--mika-surface-muted)] text-[var(--mika-fg)]"
            }`}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className={`text-lg font-bold ${isLight ? "text-zinc-900" : "text-[var(--mika-fg)]"}`}>
                <span className="text-[#E50914]">Mika</span> English
              </span>
              <button
                type="button"
                className={`rounded p-2 ${isLight ? "hover:bg-zinc-100" : "hover:bg-white/10"}`}
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
                    pathname === item.href
                      ? isLight
                        ? "bg-zinc-200 text-zinc-900"
                        : "bg-white/10 text-[var(--mika-fg)]"
                      : isLight
                        ? "text-zinc-700 hover:bg-zinc-100"
                        : "text-[var(--mika-fg-muted)] hover:bg-white/5 hover:text-[var(--mika-fg)]"
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
