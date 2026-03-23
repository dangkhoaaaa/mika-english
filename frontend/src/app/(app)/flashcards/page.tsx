"use client";

import { type ChangeEvent, useState } from "react";
import { useDispatch } from "react-redux";
import { importVocabularyBatch, setVocabularies } from "@/lib/features/vocabularySlice";
import type { AppDispatch } from "@/lib/store";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { mapVocabFromApi } from "@/lib/vocabFromApi";
import { parseVocabularyWorkbook } from "@/lib/excelVocab";
import Link from "next/link";

export default function FlashcardsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const [form, setForm] = useState({
    vocabulary: "",
    pos: "n",
    classCode: "",
    topic: "",
    meaning: "",
    example: "",
  });
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    const response = await api.get("/api/v1/vocabularies");
    const list = Array.isArray(response.data)
      ? response.data.map((row: Record<string, unknown>) => mapVocabFromApi(row))
      : [];
    dispatch(setVocabularies(list));
  };

  const syncRowsToApi = async (
    rows: Array<{
      vocabulary: string;
      pos: string;
      classCode: string;
      meaning: string;
      example: string;
      topic: string;
    }>,
  ) => {
    const token = getAccessToken();
    if (!token || rows.length === 0) return;
    setAuthToken(token);
    setSyncing(true);
    setImportMsg(null);

    try {
      const payload = {
        rows: rows.map((row) => ({
          vocabulary: row.vocabulary,
          pos: row.pos,
          class: row.classCode,
          topic: row.topic || "",
          meaning: row.meaning,
          example: row.example,
        })),
      };

      await api.post("/api/v1/vocabularies/sync", payload);
      setImportMsg(`Đã đồng bộ Excel (theo từng sheet/topic).`);
      await load();
    } catch (e) {
      console.error(e);
      setImportMsg("Đồng bộ thất bại.");
    } finally {
      setSyncing(false);
    }
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseVocabularyWorkbook(buffer);
      if (parsed.length === 0) {
        setImportMsg(
          "Không đọc được dòng hợp lệ. Mỗi sheet cần cột từ + nghĩa; tên sheet = chủ đề.",
        );
        e.target.value = "";
        return;
      }
      const byTopic = new Map<string, number>();
      parsed.forEach((r) => {
        const t = r.topic || "Khác";
        byTopic.set(t, (byTopic.get(t) ?? 0) + 1);
      });
      const summary = [...byTopic.entries()]
        .map(([t, n]) => `${t}: ${n}`)
        .join(" · ");
      setImportMsg(`Đã nhập ${parsed.length} từ (${summary}). Đang đồng bộ…`);
      await syncRowsToApi(parsed);
    } catch (err) {
      console.error(err);
      setImportMsg("Lỗi đọc file Excel.");
    }
    e.target.value = "";
  };

  const saveToApi = async () => {
    if (!form.vocabulary.trim() || !form.meaning.trim()) {
      setImportMsg("Từ và nghĩa không được để trống.");
      return;
    }
    await api.post("/api/v1/vocabularies", {
      vocabulary: form.vocabulary,
      pos: form.pos,
      class: form.classCode,
      topic: form.topic.trim(),
      meaning: form.meaning,
      example: form.example,
    });
    await load();
    setImportMsg("Đã lưu.");
  };

  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            <span className="text-[#E50914]">Thêm từ & Import</span>
          </h1>
          <p className="text-sm text-zinc-500">Nhập từng từ hoặc import Excel (mỗi sheet = một chủ đề).</p>
        </div>
        <Link
          href="/study"
          className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612]"
        >
          Vào màn học thẻ →
        </Link>
      </div>

      <section className="mb-6 rounded-xl border border-white/10 bg-[#242526] p-4">
        <button
          type="button"
          className="mb-4 rounded-lg bg-[#3a3b3c] px-4 py-2 text-sm hover:bg-[#4e4f50]"
          onClick={() => void load()}
        >
          Tải từ API
        </button>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          <input
            className="rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm"
            placeholder="Chủ đề (topic)"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
          />
          <input
            className="rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm"
            placeholder="Vocabulary"
            value={form.vocabulary}
            onChange={(e) => setForm({ ...form, vocabulary: e.target.value })}
          />
          <input
            className="rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm"
            placeholder="POS"
            value={form.pos}
            onChange={(e) => setForm({ ...form, pos: e.target.value })}
          />
          <input
            className="rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm"
            placeholder="Class"
            value={form.classCode}
            onChange={(e) => setForm({ ...form, classCode: e.target.value })}
          />
          <input
            className="rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm"
            placeholder="Meaning"
            value={form.meaning}
            onChange={(e) => setForm({ ...form, meaning: e.target.value })}
          />
          <input
            className="rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm"
            placeholder="Example"
            value={form.example}
            onChange={(e) => setForm({ ...form, example: e.target.value })}
          />
          <button
            type="button"
            className="rounded-lg bg-[#E50914] px-3 py-2 text-sm font-semibold hover:bg-[#f40612]"
            onClick={() => void saveToApi()}
          >
            Lưu
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="cursor-pointer rounded-lg border border-dashed border-white/20 bg-[#18191a] px-4 py-2 text-sm text-zinc-300 hover:bg-[#252525]">
            {syncing ? "Đang đồng bộ…" : "Import Excel (nhiều sheet)"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={syncing}
              onChange={onImport}
            />
          </label>
        </div>
        {importMsg && (
          <p className="mt-2 text-sm text-amber-200/90">{importMsg}</p>
        )}
      </section>
    </div>
  );
}
