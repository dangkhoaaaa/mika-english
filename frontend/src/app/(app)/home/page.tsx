"use client";

import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

interface NewsItem {
  id: string;
  content: string;
  imageUrl?: string;
  likes: number;
  userId?: string;
}

export default function HomePage() {
  const [posts, setPosts] = useState<NewsItem[]>([]);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [postComments, setPostComments] = useState<Record<string, Array<{ id: string; content: string }>>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fishAchievements, setFishAchievements] = useState<{
    totalUnique: number;
    totalCatches: number;
    countsByType: Record<string, number>;
    lastCaughtAt?: string;
  } | null>(null);

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
        const res = await api.get("/api/v1/fishing/achievements");
        setFishAchievements(res.data ?? null);
      } catch {
        /* ignore */
      }
    })();
  }, []);

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
        <div className="flex justify-end border-t border-white/10 pt-3">
          <button
            type="button"
            className="rounded-lg bg-[#E50914] px-6 py-2 text-sm font-semibold text-white hover:bg-[#f40612]"
            onClick={() =>
              void (async () => {
                if (!content.trim() && !imageFile) return;
                setPosting(true);
                try {
                  let imageUrl = "";
                  if (imageFile) {
                    imageUrl = await uploadImageToCloudinary(imageFile);
                  }
                  await api.post("/api/v1/news", { content, imageUrl });
                  setContent("");
                  setImageFile(null);
                  await loadPosts();
                } finally {
                  setPosting(false);
                }
              })()
            }
          >
            {posting ? "Đang đăng..." : "Đăng"}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
            Ảnh đính kèm
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {imageFile ? <span className="text-xs text-zinc-500">{imageFile.name}</span> : null}
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-xs font-medium text-zinc-300">
                U
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-200">Người học English</p>
                <p className="text-xs text-zinc-500">Bài viết · News English</p>
              </div>
            </div>
            <p className="px-4 pb-3 text-[15px] leading-relaxed text-zinc-100">{post.content}</p>
            {post.imageUrl ? (
              <div className="px-4 pb-3">
                <img src={post.imageUrl} alt="post" className="max-h-96 w-full rounded-lg object-cover" />
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-sm text-zinc-400">
              <span>{post.likes} lượt thích</span>
            </div>
            <div className="flex gap-1 border-t border-white/10 px-2 py-1">
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
                👍 Thích
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg py-2 text-sm font-medium text-zinc-300 hover:bg-white/5"
                onClick={() => void loadComments(post.id)}
              >
                💬 Bình luận
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
                📌 Lưu từ
              </button>
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
                  <div key={comment.id} className="rounded-lg bg-[#3a3b3c]/50 px-3 py-2 text-sm text-zinc-200">
                    {comment.content}
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
