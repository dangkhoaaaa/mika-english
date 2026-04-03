"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { SPEECH_LANG_OPTIONS } from "@/lib/speech";
import { getSpeechLang, setSpeechLang } from "@/lib/userPreferences";
import type { ThemeMode } from "@/lib/userPreferences";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [vocabLang, setVocabLang] = useState("en-US");
  const [meaningLang, setMeaningLang] = useState("vi-VN");
  const [exampleLang, setExampleLang] = useState("en-US");

  useEffect(() => {
    setVocabLang(getSpeechLang("vocab"));
    setMeaningLang(getSpeechLang("meaning"));
    setExampleLang(getSpeechLang("example"));
  }, []);

  const saveSpeech = (kind: "vocab" | "meaning" | "example", code: string) => {
    setSpeechLang(kind, code);
    if (kind === "vocab") setVocabLang(code);
    if (kind === "meaning") setMeaningLang(code);
    if (kind === "example") setExampleLang(code);
  };

  const setMode = (m: ThemeMode) => setTheme(m);

  return (
    <div className="mx-auto max-w-[1300px] px-3 py-8 sm:px-4">
      <div className="mb-6">
        <Link
          href="/home"
          className="text-sm text-[var(--mika-fg-subtle)] hover:text-[var(--mika-fg)]"
        >
          ← Về bảng tin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--mika-fg)]">
          <span className="text-[#E50914]">Cài đặt</span>
        </h1>
        <p className="text-sm text-[var(--mika-fg-muted)]">
          Giao diện sáng / tối và ngôn ngữ phát âm (Web Speech).
        </p>
      </div>

      <section className="mb-6 rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-5">
        <h2 className="mb-3 text-lg font-semibold text-[var(--mika-fg)]">Giao diện</h2>
        <p className="mb-3 text-sm text-[var(--mika-fg-muted)]">Chế độ sáng hoặc tối cho khung ứng dụng.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("dark")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              theme === "dark"
                ? "bg-[#E50914] text-white"
                : "border border-[color:var(--mika-border-strong)] text-[var(--mika-fg-muted)] hover:bg-[var(--mika-input-hover)]"
            }`}
          >
            Tối
          </button>
          <button
            type="button"
            onClick={() => setMode("light")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              theme === "light"
                ? "bg-[#E50914] text-white"
                : "border border-[color:var(--mika-border-strong)] text-[var(--mika-fg-muted)] hover:bg-[var(--mika-input-hover)]"
            }`}
          >
            Sáng
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-5">
        <h2 className="mb-3 text-lg font-semibold text-[var(--mika-fg)]">Phát âm</h2>
        <p className="mb-4 text-sm text-[var(--mika-fg-muted)]">
          Áp dụng khi bấm loa ở Từ vựng / Học thẻ / Từ đã lưu. Trình duyệt cần có giọng tương ứng.
        </p>
        <div className="grid max-w-xl gap-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--mika-fg-muted)]">Từ (vocabulary)</span>
            <select
              className="w-full rounded-lg border border-[color:var(--mika-border)] bg-[var(--mika-input)] px-3 py-2 text-[var(--mika-fg)]"
              value={vocabLang}
              onChange={(e) => saveSpeech("vocab", e.target.value)}
            >
              {SPEECH_LANG_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--mika-fg-muted)]">Nghĩa (meaning)</span>
            <select
              className="w-full rounded-lg border border-[color:var(--mika-border)] bg-[var(--mika-input)] px-3 py-2 text-[var(--mika-fg)]"
              value={meaningLang}
              onChange={(e) => saveSpeech("meaning", e.target.value)}
            >
              {SPEECH_LANG_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--mika-fg-muted)]">Ví dụ (example)</span>
            <select
              className="w-full rounded-lg border border-[color:var(--mika-border)] bg-[var(--mika-input)] px-3 py-2 text-[var(--mika-fg)]"
              value={exampleLang}
              onChange={(e) => saveSpeech("example", e.target.value)}
            >
              {SPEECH_LANG_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
