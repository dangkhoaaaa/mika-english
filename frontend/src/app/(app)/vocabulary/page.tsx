"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteVocabulary, setVocabularies } from "@/lib/features/vocabularySlice";
import type { AppDispatch, RootState } from "@/lib/store";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { mapVocabFromApi } from "@/lib/vocabFromApi";
import { speakEnglish, speakVietnamese } from "@/lib/speech";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useBookmarkIds } from "@/lib/useBookmarkIds";

/** Giá trị filter cho từ không có chủ đề */
const TOPIC_NONE = "__none__";

type ConfirmKind =
  | null
  | { type: "one"; id: string; word: string }
  | { type: "topic"; label: string; count: number }
  | { type: "all"; count: number };

export default function VocabularyPage() {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((s: RootState) => s.vocabulary.items);
  const [loading, setLoading] = useState(true);
  /** "" = tất cả, TOPIC_NONE = không chủ đề, khác = tên topic */
  const [filterTopic, setFilterTopic] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const { bookmarkIds, refreshBookmarks, toggleBookmarkLocal } = useBookmarkIds();

  const topicOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => {
      if (i.topic?.trim()) s.add(i.topic.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "vi"));
  }, [items]);

  const hasNoTopic = useMemo(
    () => items.some((i) => !i.topic?.trim()),
    [items],
  );

  const filteredItems = useMemo(() => {
    if (filterTopic === "") return items;
    if (filterTopic === TOPIC_NONE) return items.filter((i) => !i.topic?.trim());
    return items.filter((i) => i.topic === filterTopic);
  }, [items, filterTopic]);

  const load = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoading(true);
    try {
      const response = await api.get("/api/v1/vocabularies");
      const list = Array.isArray(response.data)
        ? response.data.map((row: Record<string, unknown>) => mapVocabFromApi(row))
        : [];
      dispatch(setVocabularies(list));
      await refreshBookmarks();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const doRemoveOne = async (id: string) => {
    setDeleting(true);
    try {
      await api.delete(`/api/v1/vocabularies/delete?id=${encodeURIComponent(id)}`);
      dispatch(deleteVocabulary(id));
      await load();
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  };

  const doDeleteTopic = async () => {
    if (filterTopic === "") return;
    const q = filterTopic === TOPIC_NONE ? "__none__" : filterTopic;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/vocabularies/by-topic?topic=${encodeURIComponent(q)}`);
      await load();
      setFilterTopic("");
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  };

  const doDeleteAll = async () => {
    setDeleting(true);
    try {
      await api.delete("/api/v1/vocabularies/all");
      await load();
      setFilterTopic("");
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  };

  const toggleBookmark = async (id: string) => {
    const on = bookmarkIds.has(id);
    try {
      if (on) {
        await api.delete(`/api/v1/bookmarks?vocabularyId=${encodeURIComponent(id)}`);
        toggleBookmarkLocal(id, false);
      } else {
        await api.post("/api/v1/bookmarks", { vocabularyId: id });
        toggleBookmarkLocal(id, true);
      }
    } catch (e) {
      console.error(e);
      await refreshBookmarks();
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-3 py-8 sm:px-4">
      <h1 className="mb-6 text-2xl font-bold">
        <span className="text-[#E50914]">Từ vựng</span> của bạn
      </h1>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#242526] p-4">
        <span className="text-sm text-zinc-400">Lọc theo chủ đề:</span>
        <select
          className="rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
        >
          <option value="">Tất cả ({items.length})</option>
          {hasNoTopic ? (
            <option value={TOPIC_NONE}>
              Không chủ đề ({items.filter((i) => !i.topic?.trim()).length})
            </option>
          ) : null}
          {topicOptions.map((t) => (
            <option key={t} value={t}>
              {t} ({items.filter((i) => i.topic === t).length})
            </option>
          ))}
        </select>
        {filterTopic !== "" && (
          <button
            type="button"
            disabled={deleting || filteredItems.length === 0}
            className="rounded-lg bg-red-900/80 px-3 py-2 text-sm text-white hover:bg-red-800 disabled:opacity-50"
            onClick={() =>
              setConfirm({
                type: "topic",
                label:
                  filterTopic === TOPIC_NONE
                    ? "từ không có chủ đề"
                    : `chủ đề “${filterTopic}”`,
                count: filteredItems.length,
              })
            }
          >
            {deleting ? "Đang xóa…" : `Xóa cả chủ đề này (${filteredItems.length})`}
          </button>
        )}
        <button
          type="button"
          disabled={deleting || items.length === 0}
          className="rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-200 hover:bg-red-950/70 disabled:opacity-50"
          onClick={() => setConfirm({ type: "all", count: items.length })}
        >
          Xóa toàn bộ từ vựng
        </button>
      </div>

      {loading && <p className="text-zinc-500">Đang tải…</p>}
      <div className="space-y-2">
        {filteredItems.map((item) => (
          <article
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-[#242526] p-4"
          >
            <div className="min-w-0 flex-1">
              {item.topic ? (
                <p className="mb-1 inline-block rounded bg-[#E50914]/20 px-2 py-0.5 text-xs text-[#E50914]">
                  {item.topic}
                </p>
              ) : null}
              <p className="font-semibold text-white">{item.vocabulary}</p>
              <p className="text-sm text-zinc-400">{item.meaning}</p>
              <p className="text-xs text-zinc-500">{item.example}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-[#3a3b3c] px-2 py-1 text-xs text-zinc-200 hover:bg-[#4e4f50]"
                  onClick={() => speakEnglish(item.vocabulary)}
                >
                  🔊 Từ (EN)
                </button>
                <button
                  type="button"
                  className="rounded bg-[#3a3b3c] px-2 py-1 text-xs text-zinc-200 hover:bg-[#4e4f50]"
                  onClick={() => speakVietnamese(item.meaning)}
                >
                  🔊 Nghĩa (VI)
                </button>
                {item.example ? (
                  <button
                    type="button"
                    className="rounded bg-[#3a3b3c] px-2 py-1 text-xs text-zinc-200 hover:bg-[#4e4f50]"
                    onClick={() => speakEnglish(item.example)}
                  >
                    🔊 Ví dụ
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${
                    bookmarkIds.has(item.id)
                      ? "bg-amber-900/80 text-amber-100 hover:bg-amber-800"
                      : "bg-[#3a3b3c] text-zinc-200 hover:bg-[#4e4f50]"
                  }`}
                  onClick={() => void toggleBookmark(item.id)}
                >
                  {bookmarkIds.has(item.id) ? "★ Đã lưu" : "☆ Lưu từ"}
                </button>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg bg-red-900/80 px-3 py-1.5 text-sm hover:bg-red-800"
              onClick={() =>
                setConfirm({ type: "one", id: item.id, word: item.vocabulary })
              }
            >
              Xóa
            </button>
          </article>
        ))}
      </div>
      {!loading && filteredItems.length === 0 && (
        <p className="rounded-xl bg-[#242526] p-8 text-center text-zinc-500">
          {items.length === 0
            ? "Chưa có từ vựng."
            : "Không có từ trong bộ lọc này."}
        </p>
      )}

      <ConfirmModal
        open={confirm?.type === "one"}
        title="Xóa từ vựng?"
        message={
          confirm?.type === "one"
            ? `Xóa “${confirm.word}”? Thao tác không hoàn tác.`
            : ""
        }
        loading={deleting}
        onConfirm={() => confirm?.type === "one" && void doRemoveOne(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.type === "topic"}
        title="Xóa cả chủ đề?"
        message={
          confirm?.type === "topic"
            ? `Xóa TẤT CẢ từ trong ${confirm.label}? (${confirm.count} từ)`
            : ""
        }
        loading={deleting}
        onConfirm={() => void doDeleteTopic()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm?.type === "all"}
        title="Xóa toàn bộ từ vựng?"
        message={
          confirm?.type === "all"
            ? `Xóa hết ${confirm.count} từ, bookmark và lịch nhắc mail liên quan. Không hoàn tác.`
            : ""
        }
        loading={deleting}
        onConfirm={() => void doDeleteAll()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
