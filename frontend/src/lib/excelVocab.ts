import * as XLSX from "xlsx";

export type ParsedVocabRow = {
  vocabulary: string;
  pos: "n" | "v" | "adj" | "adv" | "other";
  classCode: string;
  meaning: string;
  example: string;
  /** Tên sheet = chủ đề */
  topic: string;
};

function norm(s: unknown): string {
  return String(s ?? "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function fold(s: string): string {
  return norm(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d");
}

type Field = "vocabulary" | "pos" | "classCode" | "meaning" | "example";

const ALIASES: Record<Field, string[]> = {
  vocabulary: [
    "vocabulary",
    "vocab",
    "word",
    "english",
    "en",
    "tu",
    "tu vung",
    "glossary",
    "term",
    "thuat ngu",
    "terminology",
  ],
  pos: ["pos", "part of speech", "loai tu", "loai từ", "type"],
  classCode: ["class", "category", "nhom", "nhóm", "topic", "chu de", "chủ đề"],
  meaning: [
    "meaning",
    "nghia",
    "nghĩa",
    "dich",
    "dịch",
    "vietnamese",
    "vn",
    "vi",
    "definition",
    "translation",
    "dien giai",
  ],
  example: ["example", "vi du", "sentence", "cau", "câu", "context"],
};

function fieldFromHeader(headerCell: unknown): Field | null {
  const f = fold(String(headerCell ?? ""));
  if (!f) return null;
  for (const [field, aliases] of Object.entries(ALIASES) as [Field, string[]][]) {
    for (const a of aliases) {
      const af = fold(a);
      if (af.length <= 2) {
        if (f === af) return field;
        continue;
      }
      if (f === af || f.includes(af) || af.includes(f)) return field;
    }
  }
  return null;
}

function mapPos(raw: string): ParsedVocabRow["pos"] {
  const p = norm(raw);
  if (["n", "noun", "danh tu", "danh từ"].includes(p)) return "n";
  if (["v", "verb", "dong tu", "động từ"].includes(p)) return "v";
  if (["adj", "adjective", "tinh tu", "tính từ"].includes(p)) return "adj";
  if (["adv", "adverb", "trang tu", "trạng từ"].includes(p)) return "adv";
  return "other";
}

function parseRowObject(raw: Record<string, unknown>, topic: string): ParsedVocabRow | null {
  const cells: { field: Field; value: string }[] = [];
  for (const [key, val] of Object.entries(raw)) {
    const field = fieldFromHeader(key);
    if (!field) continue;
    const value = String(val ?? "")
      .replace(/\u00a0/g, " ")
      .trim();
    if (value) cells.push({ field, value });
  }
  const pick = (f: Field) => cells.find((c) => c.field === f)?.value ?? "";
  const vocabulary = pick("vocabulary");
  const meaning = pick("meaning");
  if (!vocabulary || !meaning) return null;
  return {
    vocabulary,
    pos: mapPos(pick("pos")),
    classCode: pick("classCode"),
    meaning,
    example: pick("example"),
    topic,
  };
}

function parseFromMatrix(matrix: unknown[][], topic: string): ParsedVocabRow[] {
  let headerRow = -1;
  let colMap: Partial<Record<Field, number>> = {};

  for (let r = 0; r < Math.min(matrix.length, 50); r++) {
    const row = (matrix[r] ?? []) as unknown[];
    const map: Partial<Record<Field, number>> = {};
    row.forEach((cell, idx) => {
      const field = fieldFromHeader(cell);
      if (field) map[field] = idx;
    });
    if (map.vocabulary !== undefined && map.meaning !== undefined) {
      headerRow = r;
      colMap = map;
      break;
    }
  }

  if (headerRow < 0) return [];

  const out: ParsedVocabRow[] = [];
  for (let r = headerRow + 1; r < matrix.length; r++) {
    const row = (matrix[r] ?? []) as unknown[];
    const cell = (i: number | undefined) =>
      i === undefined
        ? ""
        : String(row[i] ?? "")
            .replace(/\u00a0/g, " ")
            .trim();

    const vocabulary = cell(colMap.vocabulary);
    const meaning = cell(colMap.meaning);
    if (!vocabulary || !meaning) continue;

    out.push({
      vocabulary,
      pos: mapPos(cell(colMap.pos)),
      classCode: cell(colMap.classCode),
      meaning,
      example: cell(colMap.example),
      topic,
    });
  }
  return dedupe(out);
}

function dedupe(rows: ParsedVocabRow[]): ParsedVocabRow[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${fold(r.topic)}|${fold(r.vocabulary)}|${fold(r.meaning)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Đọc một sheet; topic = tên sheet (chủ đề). */
function parseSheet(sheet: XLSX.WorkSheet, topic: string): ParsedVocabRow[] {
  const cleanTopic = topic.replace(/\u00a0/g, " ").trim() || "Sheet";

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  const fromMatrix = parseFromMatrix(matrix, cleanTopic);
  if (fromMatrix.length > 0) return fromMatrix;

  const objects = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  const fromObjects: ParsedVocabRow[] = [];
  for (const row of objects) {
    const parsed = parseRowObject(row, cleanTopic);
    if (parsed) fromObjects.push(parsed);
  }
  return dedupe(fromObjects);
}

/** Tất cả sheet trong file — mỗi sheet = một chủ đề. Bỏ sheet trống / ẩn nếu không đọc được. */
export function parseVocabularyWorkbook(buffer: ArrayBuffer): ParsedVocabRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
  const all: ParsedVocabRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.startsWith("_")) continue;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = parseSheet(sheet, sheetName);
    all.push(...rows);
  }

  return dedupe(all);
}

/** Chỉ sheet đầu (tương thích cũ). */
export function parseVocabularyExcel(buffer: ArrayBuffer): ParsedVocabRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
  const name = workbook.SheetNames[0] ?? "Default";
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  return parseSheet(sheet, name);
}
