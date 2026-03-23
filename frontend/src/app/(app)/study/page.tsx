"use client";

import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  flipCard,
  getVisibleItems,
  nextCard,
  prevCard,
  setTopicFilter,
  setVocabularies,
  shuffleCards,
} from "@/lib/features/vocabularySlice";
import type { AppDispatch, RootState } from "@/lib/store";
import { getAccessToken } from "@/lib/session";
import { mapVocabFromApi } from "@/lib/vocabFromApi";
import { FlipCard } from "@/components/flashcard/FlipCard";
import { speakEnglish, speakVietnamese } from "@/lib/speech";
import Link from "next/link";
import { api, setAuthToken } from "@/lib/api";
import { useBookmarkIds } from "@/lib/useBookmarkIds";

export default function StudyPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { bookmarkIds, refreshBookmarks, toggleBookmarkLocal } = useBookmarkIds();
  const { items, selectedTopic, currentCardIndex, showFront } = useSelector(
    (state: RootState) => state.vocabulary,
  );

  const visibleItems = useMemo(
    () => getVisibleItems(items, selectedTopic),
    [items, selectedTopic],
  );
  const currentCard = visibleItems[currentCardIndex] ?? null;

  const topicOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => {
      if (i.topic?.trim()) s.add(i.topic.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "vi"));
  }, [items]);

  const load = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    const response = await api.get("/api/v1/vocabularies");
    const list = Array.isArray(response.data)
      ? response.data.map((row: Record<string, unknown>) => mapVocabFromApi(row))
      : [];
    dispatch(setVocabularies(list));
    await refreshBookmarks();
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

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            <span className="text-[#E50914]">Học thẻ</span>
          </h1>
          <p className="text-sm text-zinc-500">Lật thẻ và bấm loa để nghe phát âm (trình duyệt).</p>
        </div>
        <Link
          href="/flashcards"
          className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
        >
          ← Thêm / Import từ
        </Link>
      </div>

      <section className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#242526] p-4">
        <span className="text-sm text-zinc-400">Chủ đề:</span>
        <select
          className="rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
          value={selectedTopic}
          onChange={(e) => dispatch(setTopicFilter(e.target.value))}
        >
          <option value="">Tất cả ({items.length} từ)</option>
          {topicOptions.map((t) => (
            <option key={t} value={t}>
              {t} ({items.filter((i) => i.topic === t).length})
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#242526] p-4">
        {!currentCard ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-white/5 bg-[#18191a] p-8 text-center text-zinc-500">
            {items.length === 0 ? (
              <>
                Chưa có từ.{" "}
                <Link href="/flashcards" className="text-[#E50914] underline">
                  Thêm hoặc import Excel
                </Link>
              </>
            ) : (
              `Không có thẻ trong chủ đề này (${visibleItems.length} từ).`
            )}
          </div>
        ) : (
          <>
            <FlipCard
              showFront={showFront}
              onFlip={() => dispatch(flipCard())}
              front={<>{currentCard.vocabulary}</>}
              back={
                <>
                  <p className="mb-2 text-zinc-300">{currentCard.meaning}</p>
                  {currentCard.example ? (
                    <p className="mt-2 border-t border-white/10 pt-3 text-sm italic text-zinc-400">
                      {currentCard.example}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-zinc-500">
                    Chủ đề: {currentCard.topic || "—"} · POS: {currentCard.pos}
                    {currentCard.classCode ? ` · ${currentCard.classCode}` : ""}
                  </p>
                </>
              }
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm hover:bg-[#4e4f50]"
                onClick={() => speakEnglish(currentCard.vocabulary)}
              >
                🔊 Từ (EN)
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm hover:bg-[#4e4f50]"
                onClick={() => speakVietnamese(currentCard.meaning)}
              >
                🔊 Nghĩa (VI)
              </button>
              {currentCard.example ? (
                <button
                  type="button"
                  className="rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm hover:bg-[#4e4f50]"
                  onClick={() => speakEnglish(currentCard.example)}
                >
                  🔊 Ví dụ (EN)
                </button>
              ) : null}
              <button
                type="button"
                className={`rounded-lg px-3 py-2 text-sm ${
                  bookmarkIds.has(currentCard.id)
                    ? "bg-amber-900/80 text-amber-100 hover:bg-amber-800"
                    : "bg-[#3a3b3c] hover:bg-[#4e4f50]"
                }`}
                onClick={() => void toggleBookmark(currentCard.id)}
              >
                {bookmarkIds.has(currentCard.id) ? "★ Đã lưu" : "☆ Lưu từ"}
              </button>
            </div>
          </>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            className="rounded-lg bg-[#3a3b3c] px-4 py-2 text-sm"
            onClick={() => dispatch(prevCard())}
          >
            ← Trước
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#3a3b3c] px-4 py-2 text-sm"
            onClick={() => dispatch(nextCard())}
          >
            Sau →
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#3a3b3c] px-4 py-2 text-sm"
            onClick={() => dispatch(shuffleCards())}
          >
            Xáo trộn
          </button>
        </div>
      </section>
    </div>
  );
}
