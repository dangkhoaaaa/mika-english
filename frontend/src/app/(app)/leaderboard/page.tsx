"use client";

import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type Row = {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  rank?: string;
  points?: number;
  totalCatches?: number;
  totalUnique?: number;
};

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"points" | "fish">("points");
  const [topPoints, setTopPoints] = useState<Row[]>([]);
  const [topFish, setTopFish] = useState<Row[]>([]);
  const [sortBy, setSortBy] = useState<"score" | "name">("score");
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = getAccessToken();
      if (!token) return;
      setAuthToken(token);
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/api/v1/leaderboard");
        setTopPoints(Array.isArray(res.data?.topPoints) ? res.data.topPoints : []);
        setTopFish(Array.isArray(res.data?.topFish) ? res.data.topFish : []);
      } catch (e: any) {
        setError(e?.response?.data?.error ?? "Tải bảng xếp hạng thất bại.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  let rows = tab === "points" ? [...topPoints] : [...topFish];
  if (filterText.trim()) {
    const q = filterText.trim().toLowerCase();
    rows = rows.filter((r) => (r.displayName ?? "").toLowerCase().includes(q));
  }
  rows.sort((a, b) => {
    if (sortBy === "name") {
      return (a.displayName ?? "").localeCompare(b.displayName ?? "", "vi");
    }
    if (tab === "points") {
      return (b.points ?? 0) - (a.points ?? 0);
    }
    return (b.totalCatches ?? 0) - (a.totalCatches ?? 0);
  });

  return (
    <div className="mx-auto max-w-4xl px-3 py-8 sm:px-4">
      <h1 className="mb-2 text-2xl font-bold">
        <span className="text-[#E50914]">Top bảng xếp hạng</span>
      </h1>
      <p className="mb-6 text-sm text-zinc-500">Top 50 người điểm cao nhất và top 50 người câu được nhiều cá nhất.</p>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("points")}
          className={`rounded-lg px-4 py-2 text-sm ${tab === "points" ? "bg-[#E50914] text-white" : "bg-[#2b2b2b] text-zinc-300"}`}
        >
          🏆 Top điểm
        </button>
        <button
          type="button"
          onClick={() => setTab("fish")}
          className={`rounded-lg px-4 py-2 text-sm ${tab === "fish" ? "bg-[#E50914] text-white" : "bg-[#2b2b2b] text-zinc-300"}`}
        >
          🎣 Top cá
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-2 text-sm"
          placeholder="Lọc theo tên..."
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "score" | "name")}
          className="rounded-lg border border-white/10 bg-[#2b2b2b] px-3 py-2 text-sm text-zinc-200"
        >
          <option value="score">Sắp xếp theo điểm/cá</option>
          <option value="name">Sắp xếp theo tên</option>
        </select>
      </div>

      {loading ? <p className="text-zinc-500">Đang tải…</p> : null}
      {error ? <p className="rounded-lg bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}

      {!loading && !error ? (
        <section className="overflow-hidden rounded-xl border border-white/10 bg-[#202124]">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">Chưa có dữ liệu.</div>
          ) : (
            rows.map((r, idx) => (
              <article
                key={`${tab}-${r.userId}-${idx}`}
                className="flex items-center justify-between border-b border-white/10 px-4 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`w-8 text-center font-bold ${idx < 3 ? "text-amber-300" : "text-zinc-400"}`}>#{idx + 1}</div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{r.displayName || `user_${r.userId.slice(0, 6)}`}</p>
                    {tab === "points" ? (
                      <p className="text-xs text-zinc-500">Rank: {r.rank || "Đồng"}</p>
                    ) : (
                      <p className="text-xs text-zinc-500">Cá unique: {r.totalUnique ?? 0}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {tab === "points" ? (
                    <p className="font-semibold text-[#E50914]">{r.points ?? 0} điểm</p>
                  ) : (
                    <p className="font-semibold text-[#E50914]">{r.totalCatches ?? 0} cá</p>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}
    </div>
  );
}

