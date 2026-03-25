"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type UserRow = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
};

const maskEmailHideFirst5 = (email?: string) => {
  const v = String(email ?? "").trim();
  if (!v) return "—";
  const at = v.indexOf("@");
  if (at <= 0) {
    return v.length <= 5 ? "*****" : `*****${v.slice(5)}`;
  }
  const local = v.slice(0, at);
  const domain = v.slice(at);
  if (local.length <= 5) return `*****${domain}`;
  return `*****${local.slice(5)}${domain}`;
};

export default function UsersPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/v1/users/search?q=${encodeURIComponent(q)}&limit=50`);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Tìm user thất bại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Vào trang lần đầu: tự load tối đa 50 user.
    void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-3 py-8 sm:px-4">
      <h1 className="mb-2 text-2xl font-bold">
        <span className="text-[#E50914]">Tìm user</span>
      </h1>
      <p className="mb-4 text-sm text-zinc-500">Tìm theo tên hiển thị hoặc email.</p>

      <div className="mb-5 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm"
          placeholder="Nhập tên hoặc email..."
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading}
          className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Đang tìm…" : "Tìm"}
        </button>
      </div>
      {error ? <p className="mb-3 rounded-lg bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}

      <section className="space-y-2">
        {rows.map((u) => (
          <article key={u.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#242526] p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#18191a]">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-300">
                    {(u.displayName || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{u.displayName || `user_${u.id.slice(0, 6)}`}</p>
                <p className="truncate text-xs text-zinc-500">{maskEmailHideFirst5(u.email)}</p>
              </div>
            </div>
            <Link
              href={`/profile/${encodeURIComponent(u.id)}`}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/5"
            >
              Xem profile
            </Link>
          </article>
        ))}
        {rows.length === 0 ? <p className="text-zinc-500">Chưa có kết quả.</p> : null}
      </section>
    </div>
  );
}

