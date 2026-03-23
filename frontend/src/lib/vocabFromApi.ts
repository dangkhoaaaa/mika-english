import type { PartOfSpeech, VocabularyItem } from "@/lib/types";

export function mapVocabFromApi(raw: Record<string, unknown>): VocabularyItem {
  const pos = (raw.pos as string) || "other";
  const safePos = ["n", "v", "adj", "adv", "other"].includes(pos)
    ? (pos as PartOfSpeech)
    : "other";

  let createdAt = new Date().toISOString();
  if (typeof raw.createdAt === "string") {
    createdAt = raw.createdAt;
  }

  return {
    id: String(raw.id ?? ""),
    vocabulary: String(raw.vocabulary ?? ""),
    pos: safePos,
    classCode: String(raw.class ?? raw.classCode ?? ""),
    topic: String(raw.topic ?? ""),
    meaning: String(raw.meaning ?? ""),
    example: String(raw.example ?? ""),
    createdAt,
  };
}
