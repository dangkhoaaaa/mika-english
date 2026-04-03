"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { mapVocabFromApi } from "@/lib/vocabFromApi";
import {
  setVocabularies,
} from "@/lib/features/vocabularySlice";

type UserStats = {
  points: number;
  rank: string;
  streakDays: number;
  lastCheckInDate: string;
};

type QuizOptionDto = {
  vocabularyId: string;
  value: string;
};

type QuizQuestionDto = {
  questionMeaning: string;
  options: QuizOptionDto[];
};

type QuizGenerateResponse = {
  attemptId: string;
  topic: string;
  total: number;
  questions: QuizQuestionDto[];
};

export default function QuizPage() {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((s: RootState) => s.vocabulary.items);

  const [loadingVocab, setLoadingVocab] = useState(true);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [attempt, setAttempt] = useState<QuizGenerateResponse | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topicOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const t = i.topic?.trim();
      if (t) set.add(t);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [items]);

  const loadVocab = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoadingVocab(true);
    try {
      const response = await api.get("/api/v1/vocabularies");
      const list = Array.isArray(response.data)
        ? response.data.map((row: Record<string, unknown>) => mapVocabFromApi(row))
        : [];
      dispatch(setVocabularies(list));
    } finally {
      setLoadingVocab(false);
    }
  };

  const loadStats = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoadingStats(true);
    try {
      const res = await api.get("/api/v1/stats/me");
      const d = res.data ?? {};
      setStats({
        points: Number(d.points ?? 0),
        rank: String(d.rank ?? "Đồng"),
        streakDays: Number(d.streakDays ?? 0),
        lastCheckInDate: String(d.lastCheckInDate ?? ""),
      });
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    void loadVocab();
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  useEffect(() => {
    if (!topic && topicOptions.length > 0) {
      setTopic(topicOptions[0]);
    }
  }, [topic, topicOptions]);

  const start = async () => {
    if (!topic) return;
    setError(null);
    setResult(null);
    setAttempt(null);
    setAnswers([]);

    setGenerating(true);
    try {
      const res = await api.post<QuizGenerateResponse>("/api/v1/quiz/generate", {
        topic,
        count,
      });
      setAttempt(res.data);
      setAnswers(new Array(res.data.total).fill(""));
      setStep(0);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Không tạo được quiz.");
    } finally {
      setGenerating(false);
    }
  };

  const canNext = (idx: number) => {
    if (!attempt) return false;
    return answers[idx] && answers[idx].length > 0;
  };

  const onSelect = (idx: number, vocabId: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = vocabId;
      return next;
    });
  };

  const submit = async () => {
    if (!attempt) return;
    if (answers.some((a) => !a)) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{
        score: number;
        stats: UserStats;
      }>("/api/v1/quiz/submit", { attemptId: attempt.attemptId, answers });
      setResult({ score: res.data.score });
      setStats(res.data.stats);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Nộp quiz thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentIndex = step;

  if (loadingVocab || loadingStats) {
    return (
      <div className="mx-auto max-w-[1300px] px-3 py-16 text-center sm:px-4">
        <p className="text-[var(--mika-fg-subtle)]">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1300px] px-3 py-8 sm:px-4">
      <h1 className="mb-2 text-2xl font-bold">
        <span className="text-[#E50914]">Quiz topic</span>
      </h1>
      <p className="mb-6 text-sm text-[var(--mika-fg-subtle)]">
        Mỗi câu đúng +5 điểm, sai -5 điểm. Hoàn thành quiz để nhận điểm và lên rank.
      </p>

      <section className="mb-6 rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="text-sm text-[var(--mika-fg-muted)]">
            {stats ? (
              <>
                <div>
                  Điểm: <strong className="text-[var(--mika-fg)]">{stats.points}</strong> · Rank:{" "}
                  <strong className="text-[var(--mika-fg)]">{stats.rank}</strong>
                </div>
                <div className="mt-1 text-xs text-[var(--mika-fg-subtle)]">
                  Streak: {stats.streakDays} ngày · Last check-in: {stats.lastCheckInDate || "—"}
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="rounded-lg border border-[color:var(--mika-border)] bg-[var(--mika-input)] px-3 py-2 text-sm text-[var(--mika-fg)]"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {topicOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-[color:var(--mika-border)] bg-[var(--mika-input)] px-3 py-2 text-sm text-[var(--mika-fg)]"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} câu
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={generating || topicOptions.length === 0}
              className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
              onClick={() => void start()}
            >
              {generating ? "Đang tạo…" : "Bắt đầu quiz"}
            </button>
          </div>
        </div>
      </section>

      {!attempt && !error ? (
        <div className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-8 text-center text-[var(--mika-fg-subtle)]">
          Chọn topic và số câu để bắt đầu.
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {attempt && result ? (
        <section className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--mika-fg)]">Kết quả</h2>
          <p className="mt-2 text-2xl font-bold text-[#E50914]">{result.score} điểm</p>
          <div className="mt-4 text-sm text-[var(--mika-fg-muted)]">
            Hoàn thành quiz xong sẽ được cộng điểm vào rank của bạn.
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-[color:var(--mika-border-strong)] px-4 py-2 text-sm text-[var(--mika-fg)] hover:bg-white/5"
              onClick={() => {
                setAttempt(null);
                setResult(null);
                setAnswers([]);
              }}
            >
              Làm quiz khác
            </button>
            <button type="button" className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612]" onClick={() => void start()}>
              Bắt đầu lại
            </button>
          </div>
        </section>
      ) : null}

      {attempt && !result ? (
        <section className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-[var(--mika-fg-muted)]">
              Câu <strong className="text-[var(--mika-fg)]">{currentIndex + 1}</strong> / {attempt.total}
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface-muted)] p-5">
            <div className="text-sm text-[var(--mika-fg-muted)]">Câu hỏi (nghĩa tiếng Việt)</div>
            <div className="mt-2 text-xl font-bold text-[var(--mika-fg)]">{attempt.questions[currentIndex]?.questionMeaning}</div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {attempt.questions[currentIndex]?.options.map((opt) => {
              const selected = answers[currentIndex] === opt.vocabularyId;
              return (
                <button
                  key={opt.vocabularyId}
                  type="button"
                  className={`rounded-lg px-4 py-3 text-sm text-left border ${
                    selected ? "border-[#E50914] bg-[#E50914]/15" : "border-[color:var(--mika-border)] bg-[var(--mika-surface-muted)] hover:bg-white/5"
                  }`}
                  onClick={() => onSelect(currentIndex, opt.vocabularyId)}
                >
                  {opt.value}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--mika-border)] pt-4">
            <button
              type="button"
              disabled={step <= 0}
              className="rounded-lg border border-[color:var(--mika-border-strong)] px-4 py-2 text-sm text-[var(--mika-fg)] hover:bg-white/5 disabled:opacity-50"
              onClick={() => {
                setStep((s) => Math.max(0, s - 1));
              }}
            >
              ← Trước
            </button>
            {currentIndex + 1 >= attempt.total ? (
              <button
                type="button"
                disabled={submitting}
                className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
                onClick={() => void submit()}
              >
                {submitting ? "Đang chấm…" : "Nộp quiz"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canNext(currentIndex)}
                className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
                onClick={() => {
                  setStep((s) => Math.min(attempt.total - 1, s + 1));
                }}
              >
                Tiếp →
              </button>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

