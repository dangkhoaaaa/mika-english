"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken, saveSession } from "@/lib/session";
import { useTheme } from "@/components/theme/ThemeProvider";

type Mode = "login" | "register";

export function LoginForm() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/quick-start";

  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    idToken: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/quick-start");
      return;
    }
    setCheckingSession(false);
  }, [router]);

  const goHome = async (data: { accessToken: string; refreshToken: string }) => {
    saveSession(data.accessToken, data.refreshToken);
    setAuthToken(data.accessToken);
    router.replace(redirect);
  };

  const onLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/v1/auth/login", {
        email: form.email,
        password: form.password,
      });
      await goHome(data);
    } catch {
      setError("Đăng nhập thất bại. Kiểm tra email/mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/v1/auth/register", {
        email: form.email,
        password: form.password,
        displayName: form.displayName || "Học viên Mika",
      });
      await goHome(data);
    } catch {
      setError("Đăng ký thất bại. Email có thể đã tồn tại.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setError("");
    if (!form.idToken.trim()) {
      setError("Dán Google ID token (từ OAuth) để đăng nhập.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/api/v1/auth/google", {
        idToken: form.idToken,
        displayName: form.displayName || "Google User",
      });
      await goHome(data);
    } catch {
      setError("Google đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--mika-bg-page)] text-[var(--mika-fg-muted)]">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--mika-bg-page)] text-[var(--mika-fg)]">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${
          isLight
            ? "from-zinc-900/10 via-[var(--mika-bg-page)] to-[var(--mika-bg-page)]"
            : "from-black/80 via-[var(--mika-bg-page)] to-[var(--mika-bg-page)]"
        }`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(229,9,20,0.35),transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:py-16">
        <div className="mb-10 max-w-xl sm:mb-0">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-[#E50914]">Mika</span> English
          </h1>
          <p className="mt-4 text-lg text-[var(--mika-fg-muted)] sm:text-xl">
            Đăng nhập để vào bảng tin, học từ vựng và flashcard.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-[var(--mika-fg-subtle)]">
            <li>• Học từ vựng theo cách của bạn.</li>
            <li>• Excel, từ vựng, flashcard, tin nhắn, trò chơi…</li>
          </ul>
        </div>

        <div
          className={`w-full max-w-md rounded-xl border border-[color:var(--mika-border)] p-8 shadow-2xl backdrop-blur ${
            isLight ? "bg-[var(--mika-surface)]/95" : "bg-black/80"
          }`}
        >
          <div className="mb-6 flex rounded-lg bg-[var(--mika-surface-muted)] p-1">
            <button
              type="button"
              className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-[#E50914] text-white"
                  : "text-[var(--mika-fg-muted)] hover:text-[var(--mika-fg)]"
              }`}
              onClick={() => setMode("login")}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-[#E50914] text-white"
                  : "text-[var(--mika-fg-muted)] hover:text-[var(--mika-fg)]"
              }`}
              onClick={() => setMode("register")}
            >
              Đăng ký
            </button>
          </div>

          {error && (
            <p className="mb-4 rounded bg-red-500/20 px-3 py-2 text-sm text-red-200">{error}</p>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--mika-fg-muted)]">Email</label>
              <input
                className="w-full rounded border border-[color:var(--mika-border-strong)] bg-[var(--mika-input)] px-4 py-3 text-[var(--mika-fg)] placeholder:text-[var(--mika-fg-subtle)] focus:border-[#E50914] focus:outline-none"
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--mika-fg-muted)]">Mật khẩu</label>
              <input
                type="password"
                className="w-full rounded border border-[color:var(--mika-border-strong)] bg-[var(--mika-input)] px-4 py-3 text-[var(--mika-fg)] placeholder:text-[var(--mika-fg-subtle)] focus:border-[#E50914] focus:outline-none"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            {mode === "register" && (
              <div>
                <label className="mb-1 block text-xs text-[var(--mika-fg-muted)]">Tên hiển thị</label>
                <input
                  className="w-full rounded border border-[color:var(--mika-border-strong)] bg-[var(--mika-input)] px-4 py-3 text-[var(--mika-fg)] placeholder:text-[var(--mika-fg-subtle)] focus:border-[#E50914] focus:outline-none"
                  placeholder="Tên của bạn"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />
              </div>
            )}

            {mode === "login" ? (
              <button
                type="button"
                disabled={loading}
                className="mt-2 w-full rounded bg-[#E50914] py-3 font-bold text-white hover:bg-[#f40612] disabled:opacity-50"
                onClick={() => void onLogin()}
              >
                {loading ? "Đang xử lý…" : "Đăng nhập"}
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                className="mt-2 w-full rounded bg-[#E50914] py-3 font-bold text-white hover:bg-[#f40612] disabled:opacity-50"
                onClick={() => void onRegister()}
              >
                {loading ? "Đang xử lý…" : "Tạo tài khoản"}
              </button>
            )}

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[color:var(--mika-border)]" />
              </div>
              <div className="relative flex justify-center text-xs text-[var(--mika-fg-muted)]">
                <span className={`px-2 ${isLight ? "bg-[var(--mika-surface)]" : "bg-black/80"}`}>hoặc Google</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-[var(--mika-fg-muted)]">Google ID Token (tùy chọn)</label>
              <input
                className="w-full rounded border border-[color:var(--mika-border-strong)] bg-[var(--mika-input)] px-4 py-2 text-xs text-[var(--mika-fg)] placeholder:text-[var(--mika-fg-subtle)] focus:border-[#E50914] focus:outline-none"
                placeholder="id_token từ OAuth…"
                value={form.idToken}
                onChange={(e) => setForm({ ...form, idToken: e.target.value })}
              />
              <button
                type="button"
                disabled={loading}
                className={`mt-2 w-full rounded border border-[color:var(--mika-border-strong)] py-2.5 text-sm text-[var(--mika-fg)] ${
                  isLight ? "hover:bg-black/5" : "hover:bg-white/5"
                }`}
                onClick={() => void onGoogle()}
              >
                Đăng nhập Google
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--mika-fg-muted)]">Demo — điều khoản dịch vụ có thể bổ sung sau.</p>
        </div>
      </div>

      <footer className="relative z-10 border-t border-[color:var(--mika-border)] py-6 text-center text-xs text-[var(--mika-fg-subtle)]">
        <Link href="/home" className="text-[var(--mika-fg-muted)] hover:text-[#E50914]">
          Đã đăng nhập? Vào bảng tin
        </Link>
      </footer>
    </main>
  );
}
