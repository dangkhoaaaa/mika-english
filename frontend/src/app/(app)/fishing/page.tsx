"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/lib/store";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { mapVocabFromApi } from "@/lib/vocabFromApi";
import { setVocabularies } from "@/lib/features/vocabularySlice";
import Link from "next/link";

type FishStartResponse = {
  attemptId: string;
  topic: string;
  biteDelayMs: number;
  fishType: string;
  fishSizeIndex: number;
  cardVocabularyID: string;
  cardVocabulary: string;
  cardMeaning: string;
  timing: {
    mechanicDurationMs: number;
    targetStartMs: number;
    targetEndMs: number;
  };
};

type FishSubmitResponse = {
  timingOk: boolean;
  correct: boolean;
  caught: boolean;
  fishType: string;
  pointsGained: number;
  stats: {
    points: number;
    rank: string;
    streakDays: number;
    lastCheckInDate: string;
  };
};

const fishPretty = (t: string) => {
  switch (t) {
    case "D":
      return "D";
    case "C":
      return "C";
    case "B":
      return "B";
    case "A":
      return "A";
    case "A+":
      return "A+";
    case "S":
      return "S";
    case "S+":
      return "S+";
    case "SS":
      return "SS";
    case "SS+":
      return "SS+";
    case "SSS":
      return "SSS";
    case "SSS+":
      return "SSS+";
    case "SSR":
      return "SSR";
    case "UR":
      return "UR";
    case "EX":
      return "EX";
    case "Mythic":
      return "Mythic";
    case "Divine":
      return "Divine";
    default:
      return t;
  }
};

export default function FishingPage() {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((s: RootState) => s.vocabulary.items);

  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("");

  const [fxEnabled, setFxEnabled] = useState(true);

  const [attempt, setAttempt] = useState<FishStartResponse | null>(null);
  const [phase, setPhase] = useState<"idle" | "waiting" | "timing" | "answer" | "result">("idle");

  const [biteLeftMs, setBiteLeftMs] = useState(0);
  const [preTimingMs, setPreTimingMs] = useState(0);
  const [mechanicStartTs, setMechanicStartTs] = useState<number | null>(null);
  const [clickOffsetMs, setClickOffsetMs] = useState<number | null>(null);
  const [timingOkLocal, setTimingOkLocal] = useState(false);

  const [answer, setAnswer] = useState("");
  const [answerLeftMs, setAnswerLeftMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FishSubmitResponse | null>(null);

  const timersRef = useRef<{ bite?: number; answer?: number }>({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [biteFxTick, setBiteFxTick] = useState(0);
  const [resultFxTick, setResultFxTick] = useState(0);

  const [rodInfo, setRodInfo] = useState<{ name: string; biteReducePct: number; windowBonusPct: number } | null>(null);

  // Rank-up popup (dựa trên points)
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
  ] as const;

  const getRankStep = (points: number) => {
    const sorted = [...rankMilestones].sort((a, b) => a.min - b.min);
    return sorted.filter((r) => r.min <= points).slice(-1)[0] ?? sorted[0];
  };

  const [rankPopup, setRankPopup] = useState<{ from: string; to: string; color: string } | null>(null);
  const [lastPoints, setLastPoints] = useState<number | null>(null);

  const topicOptions = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => {
      const t = i.topic?.trim();
      if (t) s.add(t);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "vi"));
  }, [items]);

  const loadVocab = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVocab();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  useEffect(() => {
    void (async () => {
      const token = getAccessToken();
      if (!token) return;
      setAuthToken(token);
      try {
        const [statsRes, shopRes] = await Promise.all([api.get("/api/v1/stats/me"), api.get("/api/v1/fishing/shop")]);
        const rodId = String(statsRes.data?.rod ?? "basic");
        const rods = Array.isArray(shopRes.data) ? shopRes.data : [];
        const rod = rods.find((r: any) => String(r?.id) === rodId);
        if (!rod) {
          setRodInfo({ name: rodId, biteReducePct: 0, windowBonusPct: 0 });
          return;
        }
        const biteFactor = Number(rod.biteFactor ?? 1);
        const windowBonus = Number(rod.windowBonus ?? 0);
        setRodInfo({
          name: String(rod.name ?? rodId),
          biteReducePct: Math.max(0, Math.round((1 - biteFactor) * 100)),
          windowBonusPct: Math.round(windowBonus * 100),
        });
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!topic && topicOptions.length > 0) setTopic(topicOptions[0]);
  }, [topic, topicOptions]);

  const playBeep = (kind: "bite" | "success" | "fail") => {
    if (!fxEnabled) return;
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextCtor();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      const base =
        kind === "bite" ? 520 : kind === "success" ? 760 : 220;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(base, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // ignore audio errors
    }
  };

  // FX khi vào timing (cá cắn).
  useEffect(() => {
    if (phase !== "timing") return;
    setBiteFxTick((t) => t + 1);
    playBeep("bite");
  }, [phase, fxEnabled]);

  // FX khi có kết quả.
  useEffect(() => {
    if (!result) return;
    setResultFxTick((t) => t + 1);
    playBeep(result.caught ? "success" : "fail");
  }, [result, fxEnabled]);

  const clearTimers = () => {
    if (timersRef.current.bite) window.clearInterval(timersRef.current.bite);
    if (timersRef.current.answer) window.clearInterval(timersRef.current.answer);
    timersRef.current.bite = undefined;
    timersRef.current.answer = undefined;
  };

  const startBiteCountdown = (ms: number) => {
    clearTimers();
    setBiteLeftMs(ms);
    setPreTimingMs(0);
    const startedAt = Date.now();
    timersRef.current.bite = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, ms - elapsed);
      setBiteLeftMs(left);
      if (left <= 0) {
        if (timersRef.current.bite) window.clearInterval(timersRef.current.bite);
        timersRef.current.bite = undefined;

        // Vào timing trước (render UI), rồi đợi 3s mới bắt đầu chạy pointer/click.
        setPhase("timing");
        setMechanicStartTs(null);

        // Đợi thêm 3s cho UI load ổn định (tránh lag)
        const extra = 3000;
        setPreTimingMs(extra);
        const preStart = Date.now();
        const id = window.setInterval(() => {
          const l = Math.max(0, extra - (Date.now() - preStart));
          setPreTimingMs(l);
          if (l <= 0) {
            window.clearInterval(id);
            setMechanicStartTs(Date.now());
          }
        }, 100);
      }
    }, 100);
  };

  const startAnswerCountdown = (ms: number) => {
    setAnswerLeftMs(ms);
    const startedAt = Date.now();
    timersRef.current.answer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, ms - elapsed);
      setAnswerLeftMs(left);
      if (left <= 0) {
        if (timersRef.current.answer) window.clearInterval(timersRef.current.answer);
        timersRef.current.answer = undefined;
        void submitAnswer(true);
      }
    }, 120);
  };

  const startFishing = async () => {
    setError(null);
    setResult(null);
    setAttempt(null);
    setPhase("idle");
    clearTimers();
    if (!topic) return;
    try {
      const token = getAccessToken();
      if (!token) return;
      setAuthToken(token);
      const res = await api.post<FishStartResponse>("/api/v1/fishing/start", { topic });
      setAttempt(res.data);
      setPhase("waiting");
      setAnswer("");
      setClickOffsetMs(null);
      setTimingOkLocal(false);
      startBiteCountdown(res.data.biteDelayMs);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Không thể bắt đầu câu cá.");
    }
  };

  const onTimingClick = () => {
    if (!attempt || mechanicStartTs == null) return;
    const click = Date.now();
    const offset = click - mechanicStartTs;
    setClickOffsetMs(offset);

    const ok = offset >= attempt.timing.targetStartMs && offset <= attempt.timing.targetEndMs;
    setTimingOkLocal(ok);

    if (!ok) {
      setPhase("result");
      // gửi submit để backend lock attempt; answer không cần đúng
      void submitAnswer(false, offset, "");
      return;
    }

    setPhase("answer");
    setAnswer("");
    startAnswerCountdown(10000);
  };

  const submitAnswer = async (autoTimeout: boolean, offsetOverride?: number, answerOverride?: string) => {
    if (!attempt) return;
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const offset = offsetOverride ?? clickOffsetMs ?? 0;
      const text = answerOverride ?? answer;
      const res = await api.post<FishSubmitResponse>("/api/v1/fishing/submit", {
        attemptId: attempt.attemptId,
        clickOffsetMs: offset,
        answerText: text,
      });
      setResult(res.data);
      setPhase("result");
      clearTimers();

      // Rank-up popup
      if (res.data?.stats) {
        const newPoints = Number(res.data.stats.points ?? 0);
        const prevPoints = lastPoints ?? Math.max(0, newPoints - Number(res.data.pointsGained ?? 0));
        const prevStep = getRankStep(prevPoints);
        const nextStep = getRankStep(newPoints);
        setLastPoints(newPoints);
        if (prevStep.name !== nextStep.name) {
          setRankPopup({ from: prevStep.name, to: nextStep.name, color: nextStep.color });
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? (autoTimeout ? "Tự động nộp thất bại." : "Nộp thất bại."));
    } finally {
      setSubmitting(false);
    }
  };

  const fishBubbleStyle = (sizeIndex: number) => {
    // map 0..15 -> px (rank càng cao bóng càng to)
    const base = 30;
    const step = 6;
    const px = base + sizeIndex * step;

    const palette = (idx: number) => {
      // theo rank: thấp -> ít hiệu ứng, cao -> gradient/glow mạnh
      if (idx <= 1) return { bg: "rgba(148,163,184,0.12)", glow: "0 0 18px rgba(148,163,184,0.18)" }; // D/C
      if (idx <= 4) return { bg: "rgba(59,130,246,0.14)", glow: "0 0 20px rgba(59,130,246,0.22)" }; // B/A/A+
      if (idx <= 6) return { bg: "rgba(34,197,94,0.14)", glow: "0 0 22px rgba(34,197,94,0.28)" }; // S/S+
      if (idx <= 10) return { bg: "rgba(168,85,247,0.16)", glow: "0 0 26px rgba(217,70,239,0.34)" }; // SS..SSS+
      if (idx <= 12) return { bg: "rgba(245,158,11,0.18)", glow: "0 0 28px rgba(245,158,11,0.40)" }; // SSR/UR
      if (idx <= 13) return { bg: "rgba(239,68,68,0.18)", glow: "0 0 30px rgba(245,158,11,0.35)" }; // EX
      if (idx <= 14) return { bg: "rgba(124,58,237,0.18)", glow: "0 0 34px rgba(244,63,94,0.38)" }; // Mythic
      return { bg: "rgba(255,255,255,0.16)", glow: "0 0 40px rgba(255,255,255,0.55)" }; // Divine
    };
    const p = palette(sizeIndex);

    return {
      width: `${px}px`,
      height: `${px}px`,
      borderRadius: "9999px",
      background:
        "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0) 55%), " +
        p.bg,
      boxShadow: p.glow,
      border: "1px solid rgba(255,255,255,0.10)",
    } as const;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1300px] px-3 py-16 text-center sm:px-4">
        <p className="text-zinc-500">Đang tải…</p>
      </div>
    );
  }

  const fishSize = attempt?.fishSizeIndex ?? 2;
  const swimDurationSec = attempt ? Math.max(2.5, 7.2 - fishSize * 0.7) : 6;
  const fishAmplitudePx = 18 + fishSize * 6;

  return (
    <div className="mx-auto max-w-[1300px] px-3 py-8 sm:px-4">
      <style jsx global>{`
        @keyframes swimAcross {
          0% {
            transform: translateX(${-fishAmplitudePx}px) translateY(-50%);
          }
          50% {
            transform: translateX(calc(100% + ${fishAmplitudePx * 2}px)) translateY(-50%);
          }
          100% {
            transform: translateX(${-fishAmplitudePx}px) translateY(-50%);
          }
        }

        @keyframes splashPop {
          0% {
            transform: translate(-50%, 0) scale(0.7);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -18px) scale(1.2);
            opacity: 0;
          }
        }
      `}</style>
      <h1 className="mb-2 text-2xl font-bold">
        <span className="text-[#E50914]">Câu cá</span> topic
      </h1>
      <p className="mb-6 text-sm text-zinc-500">Timing-based mechanic theo độ hiếm cá. Cắn câu thành công rồi trả lời nghĩa trong 5 giây.</p>

      <section className="mb-5 rounded-xl border border-white/10 bg-[#242526] p-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm text-zinc-400">Topic</label>
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              {topicOptions.length === 0 ? <option value="">(Chưa có topic)</option> : null}
              {topicOptions.map((t) => (
                <option key={t} value={t}>
                  {t} ({items.filter((i) => i.topic === t).length})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            {rodInfo ? (
              <div className="hidden md:block rounded-lg border border-white/10 bg-[#18191a] px-3 py-2 text-xs text-zinc-300">
                Cần: <strong className="text-white">{rodInfo.name}</strong>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  Giảm chờ: <strong className="text-zinc-200">{rodInfo.biteReducePct}%</strong> · Bảo hộ timing:{" "}
                  <strong className="text-zinc-200">+{rodInfo.windowBonusPct}%</strong>
                </div>
              </div>
            ) : null}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-[#18191a] px-3 py-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={fxEnabled}
                onChange={(e) => setFxEnabled(e.target.checked)}
              />
              FX
            </label>
            <button
              type="button"
              disabled={!topic || phase !== "idle" && phase !== "result" || submitting}
              className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
              onClick={() => void startFishing()}
            >
              🎣 Thả mồi
            </button>
          </div>
        </div>
      </section>

      {/* Timing UI ở phía trên hồ cá */}
      {attempt && phase === "timing" ? (
        <div className="mb-4 rounded-xl border border-white/10 bg-[#18191a] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-zinc-300">
              Cá <strong className="text-white">{fishPretty(attempt.fishType)}</strong> · Timing window{" "}
              <strong className="text-white">
                {Math.max(0, attempt.timing.targetEndMs - attempt.timing.targetStartMs)}ms
              </strong>
            </div>
            <div className="text-xs text-zinc-500">
              Timing: {Math.round(attempt.timing.mechanicDurationMs / 100) / 10}s
            </div>
          </div>

          <div className="mt-3 relative h-3 rounded-full bg-white/10">
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <TimingIndicator attempt={attempt} mechanicStartTs={mechanicStartTs} onClick={onTimingClick} />
            </div>
          </div>

          <button
            type="button"
            disabled={submitting || mechanicStartTs == null || preTimingMs > 0}
            onClick={() => onTimingClick()}
            className="mt-4 w-full rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
          >
            {preTimingMs > 0 ? `Chuẩn bị… ${Math.ceil(preTimingMs / 1000)}s` : "Bấm thả câu đúng lúc"}
          </button>
        </div>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-[#242526] p-5">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#061a2d] to-[#050f1c] p-4">
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:18px_18px]"></div>

          {/* Aquarium scene */}
          {attempt ? (
            <div className="relative h-[240px]">
              {/* decorative fish bubbles */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 opacity-60">
                <div
                  className="absolute"
                  style={{
                    ...fishBubbleStyle(Math.max(0, fishSize - 2)),
                    transform: `translateX(0px) scale(${0.9 + Math.max(0, fishSize - 2) * 0.04})`,
                    filter: "saturate(0.7)",
                    animation: `swimAcross ${swimDurationSec + 1.7}s ease-in-out infinite`,
                    animationDelay: "-0.7s",
                  }}
                >
                  <span className="text-[10px] font-bold text-white/80 drop-shadow">•</span>
                </div>
              </div>

              <div
                className="absolute left-0 top-1/2 -translate-y-1/2"
                style={{
                  animation: `swimAcross ${swimDurationSec}s ease-in-out infinite`,
                }}
              >
                <div
                  style={fishBubbleStyle(fishSize)}
                  className="flex items-center justify-center"
                >
                  <span className="text-[12px] font-bold text-white/90 drop-shadow">
                    {fishPretty(attempt.fishType)}
                  </span>
                </div>
              </div>

              {/* splash when fish bites */}
              {phase === "timing" ? (
                <div
                  key={biteFxTick}
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transform: "translate(-50%, -50%)",
                    animation: "splashPop 0.6s ease-out 1",
                    pointerEvents: "none",
                  }}
                >
                  <div className="h-6 w-6 rounded-full bg-[#E50914]/25 blur-[1px]" />
                  <div className="mt-1 h-2 w-16 rounded-full bg-[#E50914]/30" />
                </div>
              ) : null}

              <div className="absolute inset-x-0 bottom-2 flex justify-center">
                <div className="text-xs text-zinc-200/80">
                  {phase === "waiting" ? "Cá đang cắn câu…" : null}
                  {phase === "waiting" ? (
                    <div className="mt-1 text-[#E50914]">
                      {Math.ceil(biteLeftMs / 1000)} giây
                    </div>
                  ) : null}
                  {phase === "waiting" && preTimingMs > 0 ? (
                    <div className="mt-1 text-zinc-200">
                      Chuẩn bị timing… <span className="text-[#E50914]">{Math.ceil(preTimingMs / 1000)}s</span>
                    </div>
                  ) : null}
                  {phase === "timing" ? <div className="text-emerald-300">Bấm đúng lúc!</div> : null}
                  {phase === "answer" ? <div className="text-emerald-300">Trả lời nghĩa:</div> : null}
                  {phase === "result" && result ? (
                    <div className="mt-1 text-white">
                      {result.caught ? "Bạn đã câu được cá!" : "Cá chạy mất rồi."}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-zinc-500">Thả mồi để bắt đầu.</div>
          )}
        </div>

        {attempt && phase === "answer" ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#18191a] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-zinc-300">
                Thẻ:{" "}
                <span className="font-bold text-white">{attempt.cardVocabulary}</span>
              </div>
              <div className="text-xs text-zinc-500">
                Còn <span className="font-semibold text-[#E50914]">{Math.ceil(answerLeftMs / 1000)}s</span>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs text-zinc-500">Nhập nghĩa tiếng Việt</label>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
                placeholder="Ví dụ: mèo"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={submitting || !answer.trim()}
                className="flex-1 min-w-[160px] rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
                onClick={() => void submitAnswer(false)}
              >
                Nộp ({Math.ceil(answerLeftMs / 1000)}s)
              </button>
              <button
                type="button"
                disabled={submitting}
                className="flex-1 min-w-[160px] rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                onClick={() => void submitAnswer(true)}
              >
                Hết giờ / nộp
              </button>
            </div>
          </div>
        ) : null}

        {attempt && phase === "result" && result ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#18191a] p-4">
            <div className="text-sm text-zinc-300">
              Cá: <strong className="text-white">{fishPretty(result.fishType)}</strong> · Timing:{" "}
              <strong className="text-white">{result.timingOk ? "OK" : "Fail"}</strong>
              {result.caught ? (
                <>
                  {" "}
                  · Trả lời: <strong className="text-emerald-300">Đúng</strong>
                </>
              ) : (
                <>
                  {" "}
                  · Trả lời: <strong className="text-red-300">Sai</strong>
                </>
              )}
            </div>
            <div className="mt-2 text-sm">
              Bạn nhận <strong className="text-[#E50914]">{result.pointsGained}</strong> điểm.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612]"
                onClick={() => {
                  setAttempt(null);
                  setPhase("idle");
                  setResult(null);
                  setError(null);
                  setClickOffsetMs(null);
                  setTimingOkLocal(false);
                  setAnswer("");
                }}
              >
                Câu tiếp
              </button>
            <Link
              href="/fish-collection"
              className="rounded-lg border border-white/20 bg-[#18191a] px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              Xem sưu tập cá
            </Link>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}
      </section>

      {rankPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#18191a] p-5 shadow-2xl">
            <h2 className="mb-2 text-sm font-semibold text-zinc-300">Chúc mừng!</h2>
            <p className={`text-xl font-bold ${rankPopup.color}`}>Bạn đã lên {rankPopup.to}</p>
            <p className="mt-2 text-xs text-zinc-400">
              Từ {rankPopup.from} → {rankPopup.to}. Tiếp tục học để lên rank cao hơn nữa.
            </p>
            <button
              type="button"
              onClick={() => setRankPopup(null)}
              className="mt-4 w-full rounded-lg bg-[#E50914] px-3 py-2 text-sm font-semibold text-white hover:bg-[#f40612]"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimingIndicator({
  attempt,
  mechanicStartTs,
  onClick,
}: {
  attempt: FishStartResponse;
  mechanicStartTs: number | null;
  onClick: () => void;
}) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (mechanicStartTs == null) return;
    let raf = 0;
    const loop = () => {
      const t = Date.now() - mechanicStartTs;
      const p = Math.min(1, Math.max(0, t / attempt.timing.mechanicDurationMs));
      setPct(p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [attempt, mechanicStartTs]);

  const targetLeftPct = attempt.timing.targetStartMs / attempt.timing.mechanicDurationMs;
  const targetRightPct = attempt.timing.targetEndMs / attempt.timing.mechanicDurationMs;

  return (
    <>
      <div
        className="absolute top-0 bottom-0 rounded-full bg-[#E50914]/25"
        style={{
          left: `${Math.min(100, Math.max(0, targetLeftPct * 100))}%`,
          width: `${Math.max(0, (targetRightPct - targetLeftPct) * 100)}%`,
        }}
      />
      {mechanicStartTs != null ? (
        <div
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#E50914]"
          style={{ left: `${pct * 100}%` }}
          role="button"
          tabIndex={0}
          onClick={() => onClick()}
        />
      ) : null}
    </>
  );
}

