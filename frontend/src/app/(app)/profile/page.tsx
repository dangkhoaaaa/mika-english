"use client";

import { useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

type ProfileData = {
  user?: {
    id?: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
    coverUrl?: string;
  } | null;
  stats?: {
    points?: number;
    rank?: string;
    streakDays?: number;
  } | null;
  fishSummary?: {
    totalUnique?: number;
    totalCatches?: number;
    countsByType?: Record<string, number>;
  } | null;
  posts?: Array<{
    id: string;
    content: string;
    likes: number;
    createdAt?: string;
  }>;
};

const rankMilestones = [
  { name: "Đồng III", min: 0, color: "text-zinc-300" },
  { name: "Đồng II", min: 66, color: "text-zinc-300" },
  { name: "Đồng I", min: 132, color: "text-zinc-300" },

  { name: "Bạc III", min: 200, color: "text-slate-200" },
  { name: "Bạc II", min: 300, color: "text-slate-200" },
  { name: "Bạc I", min: 400, color: "text-slate-200" },

  { name: "Vàng III", min: 500, color: "text-amber-300" },
  { name: "Vàng II", min: 666, color: "text-amber-300" },
  { name: "Vàng I", min: 832, color: "text-amber-300" },

  { name: "Bạch kim III", min: 1000, color: "text-cyan-300" },
  { name: "Bạch kim II", min: 1333, color: "text-cyan-300" },
  { name: "Bạch kim I", min: 1666, color: "text-cyan-300" },

  { name: "Kim cương III", min: 2000, color: "text-indigo-300" },
  { name: "Kim cương II", min: 2666, color: "text-indigo-300" },
  { name: "Kim cương I", min: 3332, color: "text-indigo-300" },

  { name: "Cao thủ III", min: 4000, color: "text-fuchsia-300" },
  { name: "Cao thủ II", min: 4333, color: "text-fuchsia-300" },
  { name: "Cao thủ I", min: 4666, color: "text-fuchsia-300" },
];

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = getAccessToken();
      if (!token) return;
      setAuthToken(token);
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/api/v1/profile/me");
        setData(res.data ?? null);
        setDisplayNameDraft(String(res.data?.user?.displayName ?? ""));
      } catch (e: any) {
        setError(e?.response?.data?.error ?? "Không tải được trang cá nhân.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const points = Number(data?.stats?.points ?? 0);
  const currentRank = String(data?.stats?.rank ?? "Đồng");
  const rankMilestonesSorted = useMemo(() => [...rankMilestones].sort((a, b) => a.min - b.min), []);

  const currentStep = useMemo(() => {
    return rankMilestonesSorted
      .filter((r) => r.min <= points)
      .slice(-1)[0];
  }, [points, rankMilestonesSorted]);

  const next = useMemo(() => {
    return rankMilestonesSorted.find((r) => r.min > points) ?? null;
  }, [points, rankMilestonesSorted]);

  const updateProfile = async (patch: { displayName?: string; avatarUrl?: string; coverUrl?: string }) => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setSaving(true);
    setError(null);
    try {
      const res = await api.put("/api/v1/profile/me", patch);
      setData(res.data ?? data);
      if (res.data?.user?.displayName) {
        setDisplayNameDraft(String(res.data.user.displayName));
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Cập nhật profile thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const onUploadAvatar = async (file?: File | null) => {
    if (!file) return;
    try {
      const url = await uploadImageToCloudinary(file);
      await updateProfile({ avatarUrl: url });
    } catch (e: any) {
      setError(e?.message ?? "Upload avatar thất bại.");
    }
  };

  const onUploadCover = async (file?: File | null) => {
    if (!file) return;
    try {
      const url = await uploadImageToCloudinary(file);
      await updateProfile({ coverUrl: url });
    } catch (e: any) {
      setError(e?.message ?? "Upload cover thất bại.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-3 py-8 sm:px-4">
      <h1 className="mb-4 text-2xl font-bold">
        <span className="text-[#E50914]">Trang cá nhân</span>
      </h1>

      {loading ? <p className="text-zinc-500">Đang tải…</p> : null}
      {error ? <p className="rounded-lg bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className="mb-4 rounded-xl border border-white/10 bg-[#242526] p-5">
            <div className="mb-4 overflow-hidden rounded-xl border border-white/10">
              <div className="h-36 bg-gradient-to-r from-[#2b3245] via-[#3f2745] to-[#513315]">
                {data?.user?.coverUrl ? (
                  <img src={data.user.coverUrl} alt="cover" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="px-4 pb-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white/20 bg-[#1f1f1f]">
                    {data?.user?.avatarUrl ? (
                      <img src={data.user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">👤</div>
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">{data?.user?.displayName || "Người học English"}</p>
                    <p className="text-xs text-zinc-500">{data?.user?.email || "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={displayNameDraft}
                    onChange={(e) => setDisplayNameDraft(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#18191a] px-3 py-1.5 text-sm"
                    placeholder="Tên hiển thị"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-50"
                    onClick={() => void updateProfile({ displayName: displayNameDraft.trim() })}
                  >
                    Lưu tên
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#18191a] px-4 py-2 text-right">
                <p className="text-xs text-zinc-500">Rank hiện tại</p>
                <p className={`text-lg font-bold ${currentStep?.color ?? "text-[#E50914]"}`}>
                  {currentStep?.name ?? currentRank}
                </p>
                <p className="text-xs text-zinc-400">{points} điểm</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/5">
                Đổi avatar
                <input type="file" accept="image/*" className="hidden" onChange={(e) => void onUploadAvatar(e.target.files?.[0])} />
              </label>
              <label className="cursor-pointer rounded-lg border border-white/20 px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/5">
                Đổi cover
                <input type="file" accept="image/*" className="hidden" onChange={(e) => void onUploadCover(e.target.files?.[0])} />
              </label>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-[#18191a] p-3 text-sm text-zinc-300">
                Streak: <strong className="text-white">{data?.stats?.streakDays ?? 0}</strong> ngày
              </div>
              <div className="rounded-lg bg-[#18191a] p-3 text-sm text-zinc-300">
                Cá unique: <strong className="text-white">{data?.fishSummary?.totalUnique ?? 0}</strong>
              </div>
              <div className="rounded-lg bg-[#18191a] p-3 text-sm text-zinc-300">
                Tổng cá: <strong className="text-white">{data?.fishSummary?.totalCatches ?? 0}</strong>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-[#18191a] p-4">
              <h2 className="mb-3 text-sm font-semibold text-zinc-200">Lộ trình rank</h2>
              <div className="space-y-2">
                {rankMilestonesSorted.map((r) => {
                  const active = currentStep?.name === r.name;
                  return (
                    <div
                      key={r.name}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                        active ? "border border-white/20 bg-white/5" : "bg-black/20"
                      }`}
                    >
                      <span className={`font-medium ${r.color}`}>{r.name}</span>
                      <span className="text-xs text-zinc-400">{`>= ${r.min} điểm`}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                {next ? `Mốc tiếp theo: ${next.name} (cần ${next.min - points} điểm nữa)` : "Bạn đã đạt mốc cao nhất!"}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#242526] p-5">
            <h2 className="mb-3 text-lg font-semibold text-white">Bài đăng của tôi</h2>
            {(data?.posts ?? []).length === 0 ? (
              <p className="text-zinc-500">Bạn chưa có bài đăng nào.</p>
            ) : (
              <div className="space-y-3">
                {(data?.posts ?? []).map((p) => (
                  <article key={p.id} className="rounded-lg border border-white/10 bg-[#18191a] p-4">
                    <p className="text-sm text-zinc-100">{p.content}</p>
                    <p className="mt-2 text-xs text-zinc-500">❤️ {p.likes} lượt thích</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

