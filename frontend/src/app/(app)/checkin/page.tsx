"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppDispatch } from "@/lib/store";
import { useDispatch } from "react-redux";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type UserStats = {
  points: number;
  rank: string;
  streakDays: number;
  lastCheckInDate: string;
  lastActiveAt?: string;
};

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export default function CheckInPage() {
  const dispatch = useDispatch<AppDispatch>();
  void dispatch;

  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCheckIn, setLoadingCheckIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGain, setLastGain] = useState<number | null>(null);

  const load = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/v1/stats/me");
      const d = res.data ?? {};
      setStats({
        points: Number(d.points ?? 0),
        rank: String(d.rank ?? "Đồng"),
        streakDays: Number(d.streakDays ?? 0),
        lastCheckInDate: String(d.lastCheckInDate ?? ""),
        lastActiveAt: d.lastActiveAt ? String(d.lastActiveAt) : undefined,
      });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Tải thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const isCheckedInToday = useMemo(() => {
    if (!stats) return false;
    return stats.lastCheckInDate === todayUTC();
  }, [stats]);

  const checkIn = async () => {
    if (isCheckedInToday) return;
    setLoadingCheckIn(true);
    setError(null);
    setLastGain(null);
    try {
      const res = await api.post("/api/v1/checkin");
      const d = res.data ?? {};
      setStats(d.stats ?? stats);
      setLastGain(Number(d.checkin?.points ?? 0));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Check-in thất bại");
    } finally {
      setLoadingCheckIn(false);
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
        <span className="text-[#E50914]">Điểm danh</span>
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Mỗi ngày check-in 1 lần. Streak càng dài thì điểm nhận càng tăng (có trần).
      </p>

      <section className="mb-6 rounded-xl border border-white/10 bg-[#242526] p-5">
        <div className="text-sm text-zinc-300">
          {stats ? (
            <>
              <div>
                Điểm: <strong className="text-white">{stats.points}</strong> · Rank:{" "}
                <strong className="text-white">{stats.rank}</strong>
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Streak hiện tại: <strong className="text-zinc-200">{stats.streakDays}</strong> ngày · Last check-in:{" "}
                <strong className="text-zinc-200">{stats.lastCheckInDate || "—"}</strong>
              </div>
              {lastGain ? (
                <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-emerald-100 text-xs">
                  Bạn vừa nhận thêm <strong>{lastGain}</strong> điểm hôm nay.
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-[#242526] p-6">
        <button
          type="button"
          disabled={isCheckedInToday || loadingCheckIn}
          onClick={() => void checkIn()}
          className="w-full rounded-lg bg-[#E50914] px-4 py-3 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
        >
          {isCheckedInToday
            ? "Hôm nay bạn đã điểm danh rồi"
            : loadingCheckIn
              ? "Đang điểm danh…"
              : "Điểm danh hôm nay (+điểm)"}
        </button>

        <div className="mt-4 text-xs text-zinc-500">
          Điểm công thức (mặc định): base 10 + (streak-1)*2, tối đa +20.
        </div>
      </section>
    </div>
  );
}

