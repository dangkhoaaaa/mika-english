"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  { name: "Đồng", min: 0, color: "text-zinc-300" },
  { name: "Bạc", min: 200, color: "text-slate-200" },
  { name: "Vàng", min: 500, color: "text-amber-300" },
  { name: "Bạch kim", min: 1000, color: "text-cyan-300" },
  { name: "Kim cương", min: 2000, color: "text-indigo-300" },
  { name: "Cao thủ", min: 4000, color: "text-fuchsia-300" },
];

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const targetUserID = searchParams.get("userId") ?? "";
  const isMe = !targetUserID;
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
        const url = isMe
          ? "/api/v1/profile/me"
          : `/api/v1/profile/user?userId=${encodeURIComponent(targetUserID)}`;
        const res = await api.get(url);
        setData(res.data ?? null);
        setDisplayNameDraft(String(res.data?.user?.displayName ?? ""));
      } catch (e: any) {
        setError(e?.response?.data?.error ?? "Không tải được trang cá nhân.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isMe, targetUserID]);

  const points = Number(data?.stats?.points ?? 0);
  const currentRank = String(data?.stats?.rank ?? "Đồng");
  const next = useMemo(() => {
    const sorted = [...rankMilestones].sort((a, b) => a.min - b.min);
    return sorted.find((r) => r.min > points) ?? null;
  }, [points]);

  const updateProfile = async (patch: { displayName?: string; avatarUrl?: string; coverUrl?: string }) => {
    if (!isMe) return;
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
        <span className="text-[#E50914]">{isMe ? "Trang cá nhân" : "Profile người dùng"}</span>
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
                {isMe ? (
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
                ) : (
                  <p className="text-sm text-zinc-500">Thông tin công khai</p>
                )}
              </div>
              <div className="rounded-lg border border-white/10 bg-[#18191a] px-4 py-2 text-right">
                <p className="text-xs text-zinc-500">Rank hiện tại</p>
                <p className="text-lg font-bold text-[#E50914]">{currentRank}</p>
                <p className="text-xs text-zinc-400">{points} điểm</p>
              </div>
            </div>
            {isMe ? (
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
            ) : null}

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
                {rankMilestones.map((r) => (
                  <div key={r.name} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                    <span className={`font-medium ${r.color}`}>{r.name}</span>
                    <span className="text-xs text-zinc-400">{`>= ${r.min} điểm`}</span>
                  </div>
                ))}
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

