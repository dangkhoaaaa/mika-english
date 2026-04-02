"use client";

import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

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
    // 🟤 Tier thấp (D → A+)
    case "D":
      return "from-zinc-700 via-zinc-700 to-zinc-800 text-white border-zinc-500/60 shadow-[0_0_10px_rgba(39,39,42,0.25)]";
    case "C":
      return "from-zinc-500 via-zinc-500 to-slate-500 text-white border-zinc-200/50 shadow-[0_0_12px_rgba(148,163,184,0.18)]";
    case "B":
      return "from-sky-400 via-blue-300 to-cyan-300 text-black border-cyan-100 shadow-[0_0_14px_rgba(56,189,248,0.22)]";
    case "A":
      return "from-blue-600 via-sky-600 to-indigo-700 text-white border-blue-200/70 shadow-[0_0_16px_rgba(59,130,246,0.28)]";
    case "A+":
      return "from-blue-800 via-indigo-800 to-slate-900 text-white border-blue-200/70 shadow-[0_0_18px_rgba(59,130,246,0.35)]";

    // 🔵 Tier khá (S → S+)
    case "S":
      return "from-emerald-500 via-green-500 to-lime-500 text-black border-lime-100 shadow-[0_0_18px_rgba(34,197,94,0.28)]";
    case "S+":
      return "from-emerald-600 via-green-600 to-lime-600 text-black border-lime-100 shadow-[0_0_22px_rgba(34,197,94,0.45)]";

    // 🟣 Tier cao (SS → SSS+)
    case "SS":
      return "from-purple-600 via-violet-600 to-fuchsia-600 text-white border-purple-200/70 shadow-[0_0_22px_rgba(168,85,247,0.42)]";
    case "SS+":
      return "from-purple-800 via-violet-800 to-fuchsia-700 text-white border-fuchsia-200/80 shadow-[0_0_26px_rgba(217,70,239,0.55)]";
    case "SSS":
      return "from-fuchsia-500 via-pink-500 to-purple-500 text-white border-pink-200/70 shadow-[0_0_28px_rgba(236,72,153,0.55)]";
    case "SSS+":
      return "from-purple-600 via-fuchsia-500 to-pink-500 text-white border-fuchsia-200/80 shadow-[0_0_32px_rgba(236,72,153,0.62)]";

    // 🟡 Tier hiếm (SSR → UR)
    case "SSR":
      return "from-amber-500 via-yellow-500 to-amber-600 text-black border-yellow-200 shadow-[0_0_34px_rgba(245,158,11,0.62)]";
    case "UR":
      return "from-yellow-300 via-amber-400 to-amber-600 text-black border-amber-100 shadow-[0_0_40px_rgba(245,158,11,0.72)]";

    // 🔴 Tier đặc biệt (EX → Mythic)
    case "EX":
      return "from-red-500 via-orange-500 to-amber-500 text-black border-amber-100 shadow-[0_0_42px_rgba(239,68,68,0.55)]";
    case "Mythic":
      return "from-violet-600 via-rose-500 to-amber-500 text-white border-amber-100/70 shadow-[0_0_46px_rgba(244,63,94,0.55)]";

    // ⚪ Tier tối thượng (Divine)
    case "Divine":
      return "from-white via-sky-100 to-purple-300 text-black border-white/80 shadow-[0_0_54px_rgba(255,255,255,0.8)]";

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

const rarityTextStyle = (t: string) => {
  switch (t) {
    case "D":
      return "text-zinc-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]";
    case "C":
      return "text-zinc-50 drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]";
    case "B":
      return "text-sky-950 drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]";
    case "A":
      return "text-sky-50 drop-shadow-[0_0_12px_rgba(59,130,246,0.55)]";
    case "A+":
      return "text-sky-50 drop-shadow-[0_0_14px_rgba(59,130,246,0.75)]";
    case "S":
      return "text-emerald-950 drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]";
    case "S+":
      return "text-emerald-950 drop-shadow-[0_0_14px_rgba(34,197,94,0.6)]";
    case "SS":
      return "text-purple-50 drop-shadow-[0_0_14px_rgba(168,85,247,0.7)]";
    case "SS+":
      return "text-fuchsia-50 drop-shadow-[0_0_16px_rgba(217,70,239,0.85)]";
    case "SSS":
      return "text-pink-50 drop-shadow-[0_0_18px_rgba(236,72,153,0.9)]";
    case "SSS+":
      return "text-pink-50 drop-shadow-[0_0_20px_rgba(236,72,153,0.95)]";
    case "SSR":
      return "text-yellow-50 drop-shadow-[0_0_20px_rgba(245,158,11,0.95)]";
    case "UR":
      return "text-yellow-50 drop-shadow-[0_0_24px_rgba(245,158,11,1)]";
    case "EX":
      return "text-amber-50 drop-shadow-[0_0_22px_rgba(239,68,68,0.85)]";
    case "Mythic":
      return "text-amber-50 drop-shadow-[0_0_24px_rgba(124,58,237,0.75)]";
    case "Divine":
      return "text-white drop-shadow-[0_0_26px_rgba(255,255,255,1)]";
    case "SSS":
      return "text-amber-50 drop-shadow-[0_0_12px_rgba(251,191,36,0.95)]";
    case "SS":
      return "text-fuchsia-50 drop-shadow-[0_0_12px_rgba(217,70,239,0.9)]";
    case "S":
      return "text-sky-900 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]";
    case "A":
      return "text-emerald-950 drop-shadow-[0_0_10px_rgba(255,255,255,0.35)]";
    case "B":
      return "text-sky-50 drop-shadow-[0_0_12px_rgba(59,130,246,0.85)]";
    case "C":
      return "text-emerald-50 drop-shadow-[0_0_12px_rgba(16,185,129,0.75)]";
    default:
      return "text-zinc-50 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]";
  }
};

export default function FishCollectionPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [summary, setSummary] = useState<{
    totalUnique: number;
    countsByType: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [sharingOne, setSharingOne] = useState<string | null>(null);
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [sellModal, setSellModal] = useState<{
    open: boolean;
    vocabId: string;
    fishType: string;
    vocabValue: string;
  }>({ open: false, vocabId: "", fishType: "", vocabValue: "" });
  const [selling, setSelling] = useState(false);

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
      <div className="mx-auto max-w-[1300px] px-3 py-16 text-center sm:px-4">
        <p className="text-zinc-500">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1300px] px-3 py-8 sm:px-4">
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

      <section className="mb-4 rounded-xl border border-white/10 bg-[#242526] p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Lọc cá theo cấp</p>
            <p className="text-xs text-zinc-500">D / C / B / A / A+ / S / S+ / SS / SS+ / SSS / SSS+ / SSR / EX / Mythic / Divine</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
            >
              <option value="ALL">Tất cả</option>
              <option value="D">D</option>
              <option value="C">C</option>
              <option value="B">B</option>
              <option value="A">A</option>
              <option value="A+">A+</option>
              <option value="S">S</option>
              <option value="S+">S+</option>
              <option value="SS">SS</option>
              <option value="SS+">SS+</option>
              <option value="SSS">SSS</option>
              <option value="SSS+">SSS+</option>
              <option value="SSR">SSR</option>
              <option value="UR">UR</option>
              <option value="EX">EX</option>
              <option value="Mythic">Mythic</option>
              <option value="Divine">Divine</option>
            </select>
            <button
              type="button"
              className="rounded-lg border border-white/20 bg-[#18191a] px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
              onClick={() => setFilterType("ALL")}
              disabled={filterType === "ALL"}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? (
          <div className="col-span-full rounded-xl border border-white/10 bg-[#242526] p-8 text-center text-zinc-500">
            Chưa có cá nào. Vào <strong className="text-white">Câu cá</strong> để câu thử.
          </div>
        ) : items.filter((it) => filterType === "ALL" || it.bestFishType === filterType).length === 0 ? (
          <div className="col-span-full rounded-xl border border-white/10 bg-[#242526] p-8 text-center text-zinc-500">
            Chưa có cá cấp <strong className="text-white">{filterType}</strong>.
          </div>
        ) : (
          items
            .filter((it) => filterType === "ALL" || it.bestFishType === filterType)
            .map((it) => (
            <article
              key={it.vocabularyId}
              className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 ${rarityStyle(it.bestFishType)}`}
            >
              <div className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 rounded-full bg-white/20 blur-xl" />
              {/* watermark rank — giữa tay phải */}
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none text-6xl font-black opacity-20">
                {fishPretty(it.bestFishType)}
              </div>
              <div className="relative min-w-[240px] flex-1">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-black/25 px-2 py-0.5 text-xs text-white/95">{it.topic}</span>
                  <span className={`rounded-full border border-white/40 bg-black/25 px-2 py-0.5 text-xs font-semibold ${rarityTextStyle(it.bestFishType)}`}>
                    Rank {fishPretty(it.bestFishType)}
                  </span>
                </div>
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded-lg border border-white/20 bg-black/25 px-2 py-1 text-xs text-zinc-100 hover:bg-white/5"
                  onClick={() => setActionsFor((v) => (v === it.vocabularyId ? null : it.vocabularyId))}
                  aria-label="Mở hành động"
                >
                  ⋯
                </button>
                <div className="mt-3 text-xl font-bold tracking-tight">{it.vocabularyValue}</div>
                <div className="text-sm opacity-95">{it.vocabularyMeaning}</div>
                <div className="mt-4 flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm">
                  <span>Lần câu</span>
                  <strong>{it.catchCount}</strong>
                </div>

                {actionsFor === it.vocabularyId ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/65 p-3">
                    <div className="w-full rounded-xl border border-white/15 bg-[#18191a] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">Hành động</p>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-sm text-zinc-300 hover:bg-white/10"
                          onClick={() => setActionsFor(null)}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          disabled={sharingOne === it.vocabularyId}
                          className="w-full rounded-lg bg-[#E50914] px-3 py-2 text-xs font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
                          onClick={async () => {
                            const token = getAccessToken();
                            if (!token) return;
                            setAuthToken(token);
                            setSharingOne(it.vocabularyId);
                            setError(null);
                            try {
                              await api.post("/api/v1/news", {
                                content: `🎣 Mình khoe cá rank ${it.bestFishType}: ${it.vocabularyValue}`,
                                fishShare: {
                                  fishType: it.bestFishType,
                                  vocabularyId: it.vocabularyId,
                                  vocabularyValue: it.vocabularyValue,
                                  vocabularyMeaning: it.vocabularyMeaning,
                                  topic: it.topic,
                                },
                              });
                              setActionsFor(null);
                            } catch (e: any) {
                              setError(e?.response?.data?.error ?? "Share cá thất bại.");
                            } finally {
                              setSharingOne(null);
                            }
                          }}
                        >
                          {sharingOne === it.vocabularyId ? "Đang chia sẻ..." : "Chia sẻ lên Home"}
                        </button>

                        <button
                          type="button"
                          className="w-full rounded-lg border border-white/20 bg-black/25 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/5"
                          onClick={() => {
                            setActionsFor(null);
                            setSellModal({
                              open: true,
                              vocabId: it.vocabularyId,
                              fishType: it.bestFishType,
                              vocabValue: it.vocabularyValue,
                            });
                          }}
                        >
                          Bán cá (nhận 💰)
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
            ))
        )}
      </section>

      <ConfirmModal
        open={sellModal.open}
        title="Bán cá"
        message={`Bạn muốn bán 1 cá của từ “${sellModal.vocabValue}” (rank ${sellModal.fishType})?\nSau khi bán sẽ nhận coins và giảm số lần câu của thẻ này.`}
        confirmLabel="Bán"
        cancelLabel="Hủy"
        danger={false}
        loading={selling}
        onCancel={() => {
          if (selling) return;
          setSellModal({ open: false, vocabId: "", fishType: "", vocabValue: "" });
        }}
        onConfirm={async () => {
          const token = getAccessToken();
          if (!token) return;
          setAuthToken(token);
          setSelling(true);
          setError(null);
          try {
            await api.post("/api/v1/fishing/sell", {
              vocabularyId: sellModal.vocabId,
              fishType: sellModal.fishType,
            });
            setSellModal({ open: false, vocabId: "", fishType: "", vocabValue: "" });
            window.dispatchEvent(new Event("coins:update"));
            await load();
          } catch (e: any) {
            setError(e?.response?.data?.error ?? "Bán cá thất bại.");
          } finally {
            setSelling(false);
          }
        }}
      />
    </div>
  );
}

