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

export default function FishCollectionPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [summary, setSummary] = useState<{
    totalUnique: number;
    countsByType: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        </section>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <section className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#242526] p-8 text-center text-zinc-500">
            Chưa có cá nào. Vào <strong className="text-white">Câu cá</strong> để câu thử.
          </div>
        ) : (
          items.map((it) => (
            <article
              key={it.vocabularyId}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#242526] p-4"
            >
              <div className="min-w-[240px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#E50914]/20 px-2 py-0.5 text-xs text-[#E50914]">{it.topic}</span>
                  <span className="rounded-full bg-amber-900/20 px-2 py-0.5 text-xs text-amber-200">
                    {fishPretty(it.bestFishType)}
                  </span>
                </div>
                <div className="mt-2 font-semibold text-white">{it.vocabularyValue}</div>
                <div className="text-sm text-zinc-400">{it.vocabularyMeaning}</div>
              </div>
              <div className="shrink-0 rounded-lg border border-white/20 bg-[#18191a] px-3 py-2 text-sm text-zinc-200">
                Lần câu: <strong className="text-white">{it.catchCount}</strong>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

