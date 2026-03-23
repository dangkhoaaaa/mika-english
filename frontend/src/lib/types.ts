export type PartOfSpeech = "n" | "v" | "adj" | "adv" | "other";

export interface VocabularyItem {
  id: string;
  vocabulary: string;
  pos: PartOfSpeech;
  /** Nhóm phụ trong Excel (cột CLASS) */
  classCode: string;
  /** Chủ đề: tên sheet Excel hoặc nhập tay */
  topic: string;
  meaning: string;
  example: string;
  createdAt: string;
}

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}
