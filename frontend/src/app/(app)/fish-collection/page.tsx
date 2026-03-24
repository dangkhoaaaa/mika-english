"use client";

import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type CollectionItem = {
  vocabularyId: string;
  vocabularyValue: string;
  vocabularyMeaning: string;
  topic: string;
  bestFishType: string;
  bestOrder: number;
  catchCount: number;
};

type CollectionResponse = {
  items: CollectionItem[];
  totalUnique: number;
  countsByType: Record<string, number>;
};

const fishPretty = (t: string) => t;

const rarityStyle = (t: string) => {
  switch (t) {
    case "SSS":
      return "from-amber-300 via-yellow-200 to-orange-400 text-black border-yellow-200 shadow-[0_0_28px_rgba(251,191,36,0.45)]";
    case "SS":
      return "from-violet-400 via-fuchsia-300 to-indigo-400 text-white border-fuchsia-200 shadow-[0_0_22px_rgba(217,70,239,0.4)]";
    case "S":
      return "from-sky-400 via-blue-300 to-cyan-300 text-black border-cyan-100 shadow-[0_0_18px_rgba(56,189,248,0.35)]";
    case "A":
      return "from-emerald-400 via-lime-300 to-green-300 text-black border-lime-100";
    case "B":
      return "from-indigo-500 via-blue-500 to-sky-500 text-white border-blue-200";
    case "C":
      return "from-green-700 via-emerald-700 to-teal-700 text-white border-emerald-200";
    default:
      return "from-zinc-500 via-zinc-400 to-slate-400 text-white border-zinc-200";
  }
};

export default function FishCollectionPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [summary, setSummary] = useState<{
    totalUnique: number;
    countsByType: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const load = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CollectionResponse>("/api/v1/fishing/collection");
      setItems(res.data.items ?? []);
      setSummary({
        totalUnique: res.data.totalUnique ?? 0,
        countsByType: res.data.countsByType ?? {},
      });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Tải sưu tập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const shareAchievement = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    if (!summary) return;
    setSharing(true);
    setError(null);
    try {
      const topType = Object.entries(summary.countsByType ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "D";
      const content = `🎣 Thành tựu câu cá của mình: ${summary.totalUnique} cá unique, ${Object.values(summary.countsByType ?? {}).reduce((a, b) => a + b, 0)} tổng cá. Rank cá nổi bật: ${topType}. Ai đua cùng không?`;
      await api.post("/api/v1/news", { content });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Share thất bại.");
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-16 text-center sm:px-4">
        <p className="text-zinc-500">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-8 sm:px-4">
      <h1 className="mb-2 text-2xl font-bold">
        <span className="text-[#E50914]">Sưu tập cá</span>
      </h1>
      <p className="mb-6 text-sm text-zinc-500">Mỗi cá tương ứng một thẻ trong topic bạn đã câu được.</p>

      {summary ? (
        <section className="mb-5 rounded-xl border border-white/10 bg-[#242526] p-4">
          <div className="text-sm text-zinc-300">
            Tổng số cá (unique từ): <strong className="text-white">{summary.totalUnique}</strong>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(summary.countsByType)
              .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
              .map(([t, n]) => (
                <span key={t} className="rounded-full border border-white/10 bg-[#18191a] px-3 py-1 text-xs text-zinc-200">
                  {fishPretty(t)}: <strong className="text-white">{n}</strong>
                </span>
              ))}
          </div>
          <button
            type="button"
            disabled={sharing}
            onClick={() => void shareAchievement()}
            className="mt-3 rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
          >
            {sharing ? "Đang chia sẻ..." : "Chia sẻ thành tựu lên Home"}
          </button>
        </section>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-full rounded-xl border border-white/10 bg-[#242526] p-8 text-center text-zinc-500">
            Chưa có cá nào. Vào <strong className="text-white">Câu cá</strong> để câu thử.
          </div>
        ) : (
          items.map((it) => (
            <article
              key={it.vocabularyId}
              className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 ${rarityStyle(it.bestFishType)}`}
            >
              <div className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 rounded-full bg-white/20 blur-xl" />
              <div className="relative min-w-[240px] flex-1">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-black/25 px-2 py-0.5 text-xs text-white/95">{it.topic}</span>
                  <span className="rounded-full border border-white/40 bg-black/20 px-2 py-0.5 text-xs font-semibold">
                    {fishPretty(it.bestFishType)}
                  </span>
                </div>
                <div className="mt-3 text-xl font-bold tracking-tight">{it.vocabularyValue}</div>
                <div className="text-sm opacity-95">{it.vocabularyMeaning}</div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm">
                  <span>Lần câu</span>
                  <strong>{it.catchCount}</strong>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

