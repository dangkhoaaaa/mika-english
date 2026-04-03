import { getSpeechLang } from "@/lib/userPreferences";

/**
 * Web Speech API — chỉ chạy trên browser, không cần server.
 * `lang` là mã BCP-47 (vd: en-US, vi-VN, ja-JP, zh-CN).
 */
export function speak(text: string, lang = "en-US") {
  if (typeof window === "undefined") return;
  const t = text?.trim();
  if (!t) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(t);
    utterance.lang = lang;
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* ignore */
  }
}

/** Danh sách ngôn ngữ (màn Cài đặt). */
export const SPEECH_LANG_OPTIONS: { code: string; label: string }[] = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "vi-VN", label: "Tiếng Việt" },
  { code: "zh-CN", label: "中文 (Giản thể)" },
  { code: "zh-TW", label: "中文 (Phồn thể)" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "es-ES", label: "Español" },
];

export function speakWithLang(text: string, lang: string) {
  speak(text, lang);
}

/** Phát âm từ — theo Cài đặt (mặc định en-US). */
export function speakVocab(text: string) {
  speak(text, getSpeechLang("vocab"));
}

/** Phát âm nghĩa — theo Cài đặt (mặc định vi-VN). */
export function speakMeaning(text: string) {
  speak(text, getSpeechLang("meaning"));
}

/** Phát âm ví dụ — theo Cài đặt (mặc định en-US). */
export function speakExampleLine(text: string) {
  speak(text, getSpeechLang("example"));
}

/** @deprecated dùng speakVocab — giữ tương thích */
export function speakEnglish(text: string) {
  speakVocab(text);
}

/** @deprecated dùng speakMeaning */
export function speakVietnamese(text: string) {
  speakMeaning(text);
}

export function stopSpeaking() {
  if (typeof window !== "undefined") {
    window.speechSynthesis.cancel();
  }
}
