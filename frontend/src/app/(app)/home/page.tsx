"use client";

import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import Link from "next/link";
import { FaBookmark, FaCommentDots, FaTrash, FaThumbsUp } from "react-icons/fa";

type UserMini = {
  id: string;
  displayName: string;
  avatarUrl?: string;
};

const fishPretty = (t: string) => t;

// Copied from Fish Collection so Home can render fish cards.
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
    default:
      return "text-zinc-50 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]";
  }
};

interface NewsItem {
  id: string;
  content: string;
  imageUrl?: string;
  likes: number;
  userId: string;
  createdAt?: string;
  user: UserMini;
  fishShare?: {
    fishType: string;
    vocabularyId: string;
    vocabularyValue: string;
    vocabularyMeaning: string;
    topic: string;
  } | null;
}

type CommentItem = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt?: string;
  user: UserMini;
};

export default function HomePage() {
  const [posts, setPosts] = useState<NewsItem[]>([]);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postComments, setPostComments] = useState<Record<string, CommentItem[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fishAchievements, setFishAchievements] = useState<{
    totalUnique: number;
    totalCatches: number;
    countsByType: Record<string, number>;
    lastCaughtAt?: string;
  } | null>(null);
  const [meUserId, setMeUserId] = useState<string>("");

  const timeAgo = (iso?: string) => {
    if (!iso) return "";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "";
    const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (diffSec < 10) return "vừa xong";
    if (diffSec < 60) return `${diffSec} giây`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} giờ`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD} ngày`;
    return new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const loadPosts = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoading(true);
    try {
      const response = await api.get("/api/v1/news?page=1&limit=20");
      setPosts(response.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (postId: string) => {
    const response = await api.get(`/api/v1/news/comments?postId=${postId}`);
    setPostComments((prev) => ({ ...prev, [postId]: response.data ?? [] }));
  };

  useEffect(() => {
    void loadPosts();
    void (async () => {
      const token = getAccessToken();
      if (!token) return;
      setAuthToken(token);
      try {
        const res = await api.get("/api/v1/profile/me");
        const u = res.data?.user;
        if (u?.id) setMeUserId(String(u.id));
      } catch {
        /* ignore */
      }
    })();
    void (async () => {
      const token = getAccessToken();
      if (!token) return;
      setAuthToken(token);
      try {
        const res = await api.get("/api/v1/fishing/achievements");
        setFishAchievements(res.data ?? null);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const postText = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api.post("/api/v1/news", { content: content.trim() });
      setContent("");
      setImageFile(null);
      await loadPosts();
    } finally {
      setPosting(false);
    }
  };

  const postWithImage = async () => {
    if (!imageFile) return;
    setPosting(true);
    try {
      const imageUrl = await uploadImageToCloudinary(imageFile);
      await api.post("/api/v1/news", { content: content.trim(), imageUrl });
      setContent("");
      setImageFile(null);
      await loadPosts();
    } finally {
      setPosting(false);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await api.delete(`/api/v1/news/delete?postId=${encodeURIComponent(postId)}`);
      await loadPosts();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 pb-12 sm:px-4">
      {fishAchievements ? (
        <section className="mb-4 rounded-xl border border-white/10 bg-[#242526] p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎣</span>
                <h2 className="text-base font-semibold text-white">Thành tựu câu cá</h2>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Unique: <strong className="text-white">{fishAchievements.totalUnique}</strong> · Tổng cá:{" "}
                <strong className="text-white">{fishAchievements.totalCatches}</strong>
              </p>
            </div>
            <span className="rounded-full bg-[#E50914]/15 px-3 py-1 text-xs text-[#E50914]">
              🎉 Bạn đang lên rank nhờ câu cá
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(fishAchievements.countsByType ?? {})
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([t, n]) => (
                <span key={t} className="rounded-full border border-white/10 bg-[#18191a] px-3 py-1 text-xs text-zinc-200">
                  {t}: <strong className="text-white">{n}</strong>
                </span>
              ))}
          </div>
        </section>
      ) : null}

      {/* Composer — kiểu Facebook */}
      <section className="mb-4 rounded-xl border border-white/10 bg-[#242526] p-4 shadow-lg">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E50914] to-[#831010] text-sm font-bold">
            ME
          </div>
          <input
            className="flex-1 rounded-full border-0 bg-[#3a3b3c] px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E50914]/50"
            placeholder="Bạn đang nghĩ gì? (English)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            disabled={posting || !content.trim()}
            className="rounded-lg bg-white/5 px-5 py-2 text-sm font-semibold text-zinc-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void postText()}
          >
            {posting ? "Đang đăng..." : "Đăng"}
          </button>
          <button
            type="button"
            disabled={posting || !imageFile}
            className="rounded-lg bg-[#E50914] px-5 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void postWithImage()}
          >
            {posting ? "Đang đăng..." : "Đăng kèm ảnh"}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-white/15 px-3 py-1 text-xs text-zinc-300 hover:bg-white/5">
            Ảnh đính kèm
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {imagePreviewUrl ? (
            <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-white/15 bg-[#18191a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreviewUrl} alt="preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImageFile(null)}
                className="absolute right-1 top-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white hover:bg-black/70"
                aria-label="Xóa ảnh"
              >
                ✕
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {loading && <p className="py-8 text-center text-zinc-500">Đang tải bảng tin…</p>}

      {!loading && posts.length === 0 && (
        <p className="rounded-xl bg-[#242526] p-8 text-center text-zinc-400">Chưa có bài viết. Hãy là người đầu tiên!</p>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-xl border border-white/10 bg-[#242526] shadow-lg"
          >
            <div className="flex items-start gap-3 p-4">
              <Link
                href={`/profile/${encodeURIComponent(post.user.id)}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3a3b3c]"
              >
                {post.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-xs font-bold text-zinc-300">U</div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${encodeURIComponent(post.user.id)}`} className="block">
                  <p className="font-semibold text-zinc-200 truncate">{post.user.displayName}</p>
                </Link>
                <p className="text-xs text-zinc-500">
                  {timeAgo(post.createdAt)} · Bài viết · News English
                </p>
              </div>
            </div>
            <p className="px-4 pb-3 text-[15px] leading-relaxed text-zinc-100">{post.content}</p>
            {post.imageUrl ? (
              <div className="px-4 pb-3">
                <img src={post.imageUrl} alt="post" className="max-h-96 w-full rounded-lg object-cover" />
              </div>
            ) : null}
            {post.fishShare ? (
              <div className="px-4 pb-3">
                <div
                  className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 ${rarityStyle(
                    post.fishShare.fishType,
                  )}`}
                >
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 select-none text-5xl font-black opacity-20">
                    {fishPretty(post.fishShare.fishType)}
                  </div>
                  <div className="relative min-w-[220px] flex-1">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-black/25 px-2 py-0.5 text-xs text-white/95">
                        {post.fishShare.topic}
                      </span>
                      <span
                        className={`rounded-full border border-white/40 bg-black/25 px-2 py-0.5 text-xs font-semibold ${rarityTextStyle(
                          post.fishShare.fishType,
                        )}`}
                      >
                        Rank {fishPretty(post.fishShare.fishType)}
                      </span>
                    </div>
                    <div className="mt-3 text-xl font-bold tracking-tight">
                      {post.fishShare.vocabularyValue}
                    </div>
                    <div className="text-sm opacity-95">{post.fishShare.vocabularyMeaning}</div>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-sm text-zinc-400">
              <span>{post.likes} lượt thích</span>
            </div>
            <div className="flex items-center gap-1 border-t border-white/10 px-2 py-1">
              <button
                type="button"
                className="flex-1 rounded-lg py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"
                onClick={() =>
                  void (async () => {
                    await api.post("/api/v1/news/like", { postId: post.id });
                    await loadPosts();
                  })()
                }
              >
                <span className="inline-flex items-center gap-2">
                  <FaThumbsUp className="text-zinc-300" />
                  Thích
                </span>
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"
                onClick={() => void loadComments(post.id)}
              >
                <span className="inline-flex items-center gap-2">
                  <FaCommentDots className="text-zinc-300" />
                  Bình luận
                </span>
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg py-2 text-sm font-medium text-emerald-400 hover:bg-white/5"
                onClick={() =>
                  void (async () => {
                    const first = post.content.split(" ")[0] ?? "word";
                    await api.post("/api/v1/news/save-word", {
                      postId: post.id,
                      vocabulary: first.toLowerCase(),
                      meaning: "Saved from social news",
                    });
                  })()
                }
              >
                <span className="inline-flex items-center gap-2">
                  <FaBookmark className="text-emerald-400" />
                  Lưu từ
                </span>
              </button>
              {meUserId && post.user.id === meUserId ? (
                <button
                  type="button"
                  className="w-10 rounded-lg py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"
                  onClick={() => void deletePost(post.id)}
                  aria-label="Xóa bài viết"
                >
                  <FaTrash />
                </button>
              ) : null}
            </div>
            <div className="border-t border-white/10 bg-[#18191a] p-3">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-full border-0 bg-[#3a3b3c] px-4 py-2 text-sm text-white placeholder:text-zinc-500"
                  placeholder="Viết bình luận…"
                  value={commentDraft[post.id] ?? ""}
                  onChange={(e) =>
                    setCommentDraft((prev) => ({ ...prev, [post.id]: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="rounded-full bg-[#3a3b3c] px-4 py-2 text-sm text-[#E50914] hover:bg-[#4e4f50]"
                  onClick={() =>
                    void (async () => {
                      const draft = commentDraft[post.id];
                      if (!draft?.trim()) return;
                      await api.post("/api/v1/news/comment", { postId: post.id, content: draft });
                      setCommentDraft((prev) => ({ ...prev, [post.id]: "" }));
                      await loadComments(post.id);
                    })()
                  }
                >
                  Gửi
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {(postComments[post.id] ?? []).map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-lg bg-[#3a3b3c]/50 px-3 py-2 text-sm text-zinc-200"
                  >
                    <div className="flex items-start gap-2">
                      <Link href={`/profile/${encodeURIComponent(comment.user.id)}`} className="mt-0.5 shrink-0">
                        {comment.user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={comment.user.avatarUrl}
                            alt="avatar"
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f2f2f] text-[11px] font-bold text-zinc-300">
                            {comment.user.displayName?.slice(0, 1).toUpperCase() ?? "U"}
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/profile/${encodeURIComponent(comment.user.id)}`} className="block">
                          <p className="text-xs text-zinc-300 truncate">{comment.user.displayName}</p>
                        </Link>
                        <p className="text-sm text-zinc-200 break-words">{comment.content}</p>
                        <p className="mt-1 text-[11px] text-zinc-500">{timeAgo(comment.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
