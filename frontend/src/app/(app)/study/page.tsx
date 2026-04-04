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
import { speakExampleLine, speakMeaning, speakVocab } from "@/lib/speech";
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
    <div className="mx-auto max-w-[1300px] px-3 py-6 sm:px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--mika-fg)]">
            <span className="text-[#E50914]">Học thẻ</span>
          </h1>
          <p className="text-sm text-[var(--mika-fg-subtle)]">
            Lật thẻ và bấm loa để nghe phát âm (trình duyệt). Chọn ngôn ngữ phát âm trong{" "}
            <Link href="/settings" className="text-[#E50914] underline">
              Cài đặt
            </Link>
            .
          </p>
        </div>
        <Link
          href="/flashcards"
          className="rounded-lg border border-[color:var(--mika-border-strong)] px-3 py-1.5 text-sm text-[var(--mika-fg-muted)] hover:bg-white/5"
        >
          ← Thêm / Import từ
        </Link>
      </div>

      <section className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-4">
        <span className="text-sm text-[var(--mika-fg-muted)]">Chủ đề:</span>
        <select
          className="rounded-lg border border-[color:var(--mika-border)] bg-[var(--mika-input)] px-3 py-2 text-sm text-[var(--mika-fg)]"
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

      <section className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-4">
        {!currentCard ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-[color:var(--mika-border-faint)] bg-[var(--mika-surface-muted)] p-8 text-center text-[var(--mika-fg-subtle)]">
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
              onSwipeNext={() => dispatch(nextCard())}
              onSwipePrev={() => dispatch(prevCard())}
              front={<>{currentCard.vocabulary}</>}
              back={
                <>
                  <p className="mb-2 text-[var(--mika-fg-muted)]">{currentCard.meaning}</p>
                  {currentCard.example ? (
                    <p className="mt-2 border-t border-[color:var(--mika-border)] pt-3 text-sm italic text-[var(--mika-fg-muted)]">
                      {currentCard.example}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-[var(--mika-fg-subtle)]">
                    Chủ đề: {currentCard.topic || "—"} · POS: {currentCard.pos}
                    {currentCard.classCode ? ` · ${currentCard.classCode}` : ""}
                  </p>
                </>
              }
            />

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-[var(--mika-input)] px-3 py-2 text-sm hover:bg-[var(--mika-input-hover)]"
                  onClick={() => speakVocab(currentCard.vocabulary)}
                >
                  🔊 Từ (EN)
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[var(--mika-input)] px-3 py-2 text-sm hover:bg-[var(--mika-input-hover)]"
                  onClick={() => speakMeaning(currentCard.meaning)}
                >
                  🔊 Nghĩa (VI)
                </button>
                {currentCard.example ? (
                  <button
                    type="button"
                    className="rounded-lg bg-[var(--mika-input)] px-3 py-2 text-sm hover:bg-[var(--mika-input-hover)]"
                    onClick={() => speakExampleLine(currentCard.example)}
                  >
                    🔊 Ví dụ (EN)
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                className={`shrink-0 rounded-lg px-3 py-2 text-sm ${
                  bookmarkIds.has(currentCard.id)
                    ? "bg-amber-900/80 text-amber-100 hover:bg-amber-800"
                    : "bg-[var(--mika-input)] hover:bg-[var(--mika-input-hover)]"
                }`}
                onClick={() => void toggleBookmark(currentCard.id)}
              >
                {bookmarkIds.has(currentCard.id) ? "★ Đã lưu" : "☆ Lưu từ"}
              </button>
            </div>
          </>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[color:var(--mika-border)] pt-4">
          <button
            type="button"
            className="rounded-lg bg-[var(--mika-input)] px-4 py-2 text-sm"
            onClick={() => dispatch(prevCard())}
          >
            ← Trước
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--mika-input)] px-4 py-2 text-sm"
            onClick={() => dispatch(nextCard())}
          >
            Sau →
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--mika-input)] px-4 py-2 text-sm"
            onClick={() => dispatch(shuffleCards())}
          >
            Xáo trộn
          </button>
        </div>
      </section>
    </div>
  );
}
