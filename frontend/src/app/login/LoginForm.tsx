"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken, saveSession } from "@/lib/session";

type Mode = "login" | "register";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/home";

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
      router.replace("/home");
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
      <div className="flex min-h-screen items-center justify-center bg-[#141414] text-zinc-500">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#141414] text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-[#141414] to-[#141414]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(229,9,20,0.35),transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:py-16">
        <div className="mb-10 max-w-xl sm:mb-0">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-[#E50914]">Mika</span> English
          </h1>
          <p className="mt-4 text-lg text-zinc-300 sm:text-xl">
            Đăng nhập để vào bảng tin, học từ vựng và flashcard — tông màu Netflix.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-zinc-400">
            <li>• Bảng tin kiểu Facebook (dark)</li>
            <li>• Menu trái: Excel, từ vựng, flashcard, tin nhắn…</li>
          </ul>
        </div>

        <div className="w-full max-w-md rounded-xl border border-white/10 bg-black/80 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 flex rounded-lg bg-[#333] p-1">
            <button
              type="button"
              className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition ${
                mode === "login" ? "bg-[#E50914] text-white" : "text-zinc-400 hover:text-white"
              }`}
              onClick={() => setMode("login")}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-2.5 text-sm font-semibold transition ${
                mode === "register" ? "bg-[#E50914] text-white" : "text-zinc-400 hover:text-white"
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
              <label className="mb-1 block text-xs text-zinc-500">Email</label>
              <input
                className="w-full rounded border border-[#333] bg-[#333] px-4 py-3 text-white placeholder:text-zinc-500 focus:border-[#E50914] focus:outline-none"
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Mật khẩu</label>
              <input
                type="password"
                className="w-full rounded border border-[#333] bg-[#333] px-4 py-3 text-white placeholder:text-zinc-500 focus:border-[#E50914] focus:outline-none"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            {mode === "register" && (
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Tên hiển thị</label>
                <input
                  className="w-full rounded border border-[#333] bg-[#333] px-4 py-3 text-white placeholder:text-zinc-500 focus:border-[#E50914] focus:outline-none"
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
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs text-zinc-500">
                <span className="bg-black/80 px-2">hoặc Google</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-zinc-500">Google ID Token (tùy chọn)</label>
              <input
                className="w-full rounded border border-[#333] bg-[#333] px-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:border-[#E50914] focus:outline-none"
                placeholder="id_token từ OAuth…"
                value={form.idToken}
                onChange={(e) => setForm({ ...form, idToken: e.target.value })}
              />
              <button
                type="button"
                disabled={loading}
                className="mt-2 w-full rounded border border-white/20 py-2.5 text-sm hover:bg-white/5"
                onClick={() => void onGoogle()}
              >
                Đăng nhập Google
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-500">Demo — điều khoản dịch vụ có thể bổ sung sau.</p>
        </div>
      </div>

      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-xs text-zinc-600">
        <Link href="/home" className="text-zinc-500 hover:text-[#E50914]">
          Đã đăng nhập? Vào bảng tin
        </Link>
      </footer>
    </main>
  );
}
