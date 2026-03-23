/**
 * Web Speech API — chỉ chạy trên browser, không cần server.
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

/** Từ tiếng Anh */
export function speakEnglish(text: string) {
  speak(text, "en-US");
}

/** Nghĩa / giải thích tiếng Việt */
export function speakVietnamese(text: string) {
  speak(text, "vi-VN");
}

export function stopSpeaking() {
  if (typeof window !== "undefined") {
    window.speechSynthesis.cancel();
  }
}
