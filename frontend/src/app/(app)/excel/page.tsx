"use client";

import { useEffect, useMemo, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { parseVocabularyWorkbook } from "@/lib/excelVocab";
import Link from "next/link";

type LibraryItem = {
  id: string;
  title: string;
  sheetUrl: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
};

const sampleGoogleSheetUrl =
  "https://docs.google.com/spreadsheets/d/1bBZ-s5hLmk6KYcfnhwyp0cb9JD1ui1WielZ5CPkFVdc/edit?gid=519826982#gid=519826982";

const sheetUrlToExportXlsx = (url: string): string | null => {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const id = m[1];
  const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
  const gid = gidMatch?.[1];
  if (gid) {
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx&gid=${gid}`;
  }
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
};

export default function ExcelPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const load = async (nextPage = page) => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.get(`/api/v1/excel-library?page=${nextPage}&limit=${limit}`);
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setTotal(Number(res.data?.total ?? 0));
      setPage(Number(res.data?.page ?? nextPage));
    } catch (e: any) {
      setMsg(e?.response?.data?.error ?? "Tải kho excel thất bại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncFromShare = async (it: LibraryItem) => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    const exportUrl = sheetUrlToExportXlsx(it.sheetUrl);
    if (!exportUrl) {
      setMsg("Link sheet không hợp lệ.");
      return;
    }
    setSyncingId(it.id);
    setMsg("Đang tải và đồng bộ...");
    try {
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error("fetch failed");
      const buffer = await res.arrayBuffer();
      const parsed = parseVocabularyWorkbook(buffer);
      if (parsed.length === 0) {
        setMsg("File không có dữ liệu hợp lệ để sync.");
        return;
      }
      await api.post("/api/v1/vocabularies/sync", {
        rows: parsed.map((r) => ({
          vocabulary: r.vocabulary,
          pos: r.pos,
          class: r.classCode,
          topic: r.topic || "",
          meaning: r.meaning,
          example: r.example,
        })),
      });
      setMsg(`Đồng bộ thành công từ "${it.title}" (${parsed.length} từ).`);
    } catch (e: any) {
      setMsg(e?.response?.data?.error ?? "Đồng bộ thất bại.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] px-3 py-8 sm:px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-2 text-2xl font-bold">
            <span className="text-[#E50914]">Kho excel</span>
          </h1>
          <p className="text-[var(--mika-fg-muted)]">
            Danh sách excel do cộng đồng chia sẻ. Bạn có thể tải về hoặc đồng bộ thẳng vào thư viện từ vựng.
          </p>
        </div>
        <Link href="/flashcards" className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612]">
          Import excel của riêng bạn →
        </Link>
      </div>

      <section className="mb-4 rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[var(--mika-fg)]">Mẫu excel chuẩn</p>
            <p className="text-xs text-[var(--mika-fg-subtle)]">Bạn có thể tải mẫu này về để bắt đầu nhanh.</p>
          </div>
          <div className="flex gap-2">
            <a
              href={sampleGoogleSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[color:var(--mika-border-strong)] px-3 py-2 text-sm text-[var(--mika-fg)] hover:bg-white/5"
            >
              Mở mẫu
            </a>
            <button
              type="button"
              className="rounded-lg bg-[#E50914] px-3 py-2 text-sm font-semibold text-white hover:bg-[#f40612]"
              onClick={() => {
                const u = sheetUrlToExportXlsx(sampleGoogleSheetUrl);
                if (u) window.open(u, "_blank");
              }}
            >
              Tải mẫu
            </button>
          </div>
        </div>
      </section>

      {msg ? (
        <div className="mb-4 rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-3 text-sm text-[var(--mika-fg)]">
          {msg}
        </div>
      ) : null}

      <section className="space-y-3">
        {loading ? (
          <div className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-8 text-center text-[var(--mika-fg-subtle)]">Đang tải kho excel…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-8 text-center text-[var(--mika-fg-subtle)]">Chưa có excel nào được share.</div>
        ) : (
          items.map((it) => (
            <article key={it.id} className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[var(--mika-fg)]">{it.title}</p>
                  <p className="mt-1 text-xs text-[var(--mika-fg-subtle)]">
                    Share bởi{" "}
                    <Link href={`/profile/${encodeURIComponent(it.user?.id || "")}`} className="text-[var(--mika-fg-muted)] underline">
                      {it.user?.displayName || "User"}
                    </Link>{" "}
                    · {new Date(it.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={it.sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[color:var(--mika-border-strong)] px-3 py-2 text-sm text-[var(--mika-fg)] hover:bg-white/5"
                  >
                    Mở mẫu
                  </a>
                  <a
                    href={sheetUrlToExportXlsx(it.sheetUrl) ?? it.sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[color:var(--mika-border-strong)] px-3 py-2 text-sm text-[var(--mika-fg)] hover:bg-white/5"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    disabled={syncingId === it.id}
                    className="rounded-lg bg-[#E50914] px-3 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
                    onClick={() => void syncFromShare(it)}
                  >
                    {syncingId === it.id ? "Đang sync..." : "Đồng bộ vào từ vựng"}
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <div className="mt-5 flex items-center justify-center gap-2">
        <button
          type="button"
          disabled={page <= 1 || loading}
          className="rounded-lg border border-[color:var(--mika-border-strong)] px-3 py-2 text-sm text-[var(--mika-fg)] hover:bg-white/5 disabled:opacity-50"
          onClick={() => void load(page - 1)}
        >
          ← Trang trước
        </button>
        <span className="text-sm text-[var(--mika-fg-muted)]">
          Trang {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          className="rounded-lg border border-[color:var(--mika-border-strong)] px-3 py-2 text-sm text-[var(--mika-fg)] hover:bg-white/5 disabled:opacity-50"
          onClick={() => void load(page + 1)}
        >
          Trang sau →
        </button>
      </div>
    </div>
  );
}
