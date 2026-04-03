/** Lưu localStorage — theme + ngôn ngữ phát âm (Web Speech API). */

export type ThemeMode = "dark" | "light";

const KEY_THEME = "mika:theme";
const KEY_SPEECH_VOCAB = "mika:speech:vocab";
const KEY_SPEECH_MEANING = "mika:speech:meaning";
const KEY_SPEECH_EXAMPLE = "mika:speech:example";

export const DEFAULT_SPEECH = {
  vocab: "en-US",
  meaning: "vi-VN",
  example: "en-US",
} as const;

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem(KEY_THEME);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function setStoredTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(KEY_THEME, mode);
  } catch {
    /* ignore */
  }
}

export function getSpeechLang(kind: "vocab" | "meaning" | "example"): string {
  if (typeof window === "undefined") {
    return DEFAULT_SPEECH[kind];
  }
  const key =
    kind === "vocab" ? KEY_SPEECH_VOCAB : kind === "meaning" ? KEY_SPEECH_MEANING : KEY_SPEECH_EXAMPLE;
  try {
    const v = localStorage.getItem(key);
    return v && v.trim() ? v.trim() : DEFAULT_SPEECH[kind];
  } catch {
    return DEFAULT_SPEECH[kind];
  }
}

export function setSpeechLang(kind: "vocab" | "meaning" | "example", code: string) {
  const key =
    kind === "vocab" ? KEY_SPEECH_VOCAB : kind === "meaning" ? KEY_SPEECH_MEANING : KEY_SPEECH_EXAMPLE;
  try {
    localStorage.setItem(key, code);
  } catch {
    /* ignore */
  }
}
