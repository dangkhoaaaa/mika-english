"use client";

import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type RodInfo = {
  id: string;
  name: string;
  price: number;
  biteFactor: number;
  windowBonus: number;
};

type Stats = {
  coins: number;
  rod?: string;
  ownedRods?: string[];
};

export default function ShopPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rods, setRods] = useState<RodInfo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  const load = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoading(true);
    setError(null);
    try {
      const [shopRes, statsRes] = await Promise.all([api.get("/api/v1/fishing/shop"), api.get("/api/v1/stats/me")]);
      setRods(Array.isArray(shopRes.data) ? shopRes.data : []);
      setStats({
        coins: Number(statsRes.data?.coins ?? 0),
        rod: statsRes.data?.rod ? String(statsRes.data.rod) : undefined,
        ownedRods: Array.isArray(statsRes.data?.ownedRods) ? statsRes.data.ownedRods.map(String) : [],
      });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Tải shop thất bại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const buy = async (rodId: string) => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setBuying(rodId);
    setError(null);
    try {
      const res = await api.post("/api/v1/fishing/shop/buy", { rodId });
      const st = res.data?.stats;
      setStats({
        coins: Number(st?.coins ?? 0),
        rod: st?.rod ? String(st.rod) : rodId,
        ownedRods: Array.isArray(st?.ownedRods) ? st.ownedRods.map(String) : stats?.ownedRods ?? [],
      });
      window.dispatchEvent(new Event("coins:update"));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Mua thất bại.");
    } finally {
      setBuying(null);
    }
  };

  const equip = async (rodId: string) => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setBuying(rodId);
    setError(null);
    try {
      const res = await api.post("/api/v1/fishing/shop/equip", { rodId });
      const st = res.data?.stats;
      setStats({
        coins: Number(st?.coins ?? 0),
        rod: st?.rod ? String(st.rod) : rodId,
        ownedRods: Array.isArray(st?.ownedRods) ? st.ownedRods.map(String) : stats?.ownedRods ?? [],
      });
      window.dispatchEvent(new Event("coins:update"));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Trang bị thất bại.");
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1300px] px-3 py-16 text-center sm:px-4">
        <p className="text-[var(--mika-fg-subtle)]">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1300px] px-3 py-8 sm:px-4">
      <h1 className="mb-2 text-2xl font-bold">
        <span className="text-[#E50914]">Shop dụng cụ</span>
      </h1>
      <p className="mb-4 text-sm text-[var(--mika-fg-subtle)]">
        Mua cần câu bằng coins để giảm thời gian chờ và có “bảo hộ timing” (+10% window).
      </p>

      <section className="mb-5 rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-[var(--mika-fg-muted)]">
            Coins hiện có: <strong className="text-yellow-200">💰 {stats?.coins ?? 0}</strong>
          </div>
          <div className="text-xs text-[var(--mika-fg-subtle)]">Cần đang dùng: {stats?.rod ?? "basic"}</div>
        </div>
      </section>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-3">
        {rods.map((r) => {
          const active = (stats?.rod ?? "basic") === r.id;
          const owned = (stats?.ownedRods ?? []).includes(r.id) || r.price === 0;
          const canBuy = (stats?.coins ?? 0) >= r.price;
          return (
            <article key={r.id} className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[var(--mika-fg)]">
                    {r.name} {active ? <span className="text-xs text-emerald-300">(Đang dùng)</span> : null}
                  </p>
                  <p className="mt-1 text-xs text-[var(--mika-fg-subtle)]">
                    Giá: <span className="text-yellow-200">💰 {r.price}</span> · Giảm chờ:{" "}
                    <strong className="text-[var(--mika-fg)]">{Math.round((1 - r.biteFactor) * 100)}%</strong> · Bảo hộ timing:{" "}
                    <strong className="text-[var(--mika-fg)]">+{Math.round(r.windowBonus * 100)}%</strong>
                  </p>
                  {owned && !active ? (
                    <p className="mt-1 text-[11px] text-emerald-300">Đã sở hữu</p>
                  ) : null}
                </div>

                {owned ? (
                  <button
                    type="button"
                    disabled={active || buying === r.id}
                    onClick={() => void equip(r.id)}
                    className="rounded-lg border border-[color:var(--mika-border-strong)] bg-black/25 px-4 py-2 text-sm font-semibold text-[var(--mika-fg)] hover:bg-white/5 disabled:opacity-50"
                  >
                    {active ? "Đang dùng" : buying === r.id ? "Đang trang bị..." : "Trang bị"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={active || buying === r.id || (!canBuy && r.price > 0)}
                    onClick={() => void buy(r.id)}
                    className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
                  >
                    {buying === r.id ? "Đang mua..." : "Mua"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

