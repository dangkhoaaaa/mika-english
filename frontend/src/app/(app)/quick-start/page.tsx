"use client";

import Link from "next/link";

const sampleGoogleSheetUrl =
  "https://docs.google.com/spreadsheets/d/1bBZ-s5hLmk6KYcfnhwyp0cb9JD1ui1WielZ5CPkFVdc/edit?gid=519826982#gid=519826982";

const sheetUrlToExportXlsx = (url: string): string | null => {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const id = m[1];
  const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
  const gid = gidMatch?.[1];
  if (gid) return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx&gid=${gid}`;
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
};

export default function QuickStartPage() {
  const sampleDownloadUrl = sheetUrlToExportXlsx(sampleGoogleSheetUrl) ?? sampleGoogleSheetUrl;

  return (
    <div className="mx-auto max-w-[1300px] px-3 py-6 sm:px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--mika-fg)]">
          <span className="text-[#E50914]">Quick Start</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--mika-fg-subtle)]">
          Bắt đầu nhanh trong 3-5 phút: lấy mẫu Excel, import từ vựng, rồi học bằng thẻ/quiz/câu cá.
        </p>
      </div>

      <section className="mb-4 rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            <a
              href={sampleDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[#E50914] px-3 py-2 text-sm font-semibold text-white hover:bg-[#f40612]"
            >
              Tải mẫu
            </a>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-[color:var(--mika-border)] bg-[var(--mika-surface-muted)] p-3">
          <p className="text-xs font-semibold text-[var(--mika-fg)]">Lưu ý định dạng Excel (bắt buộc)</p>
          <p className="mt-1 text-xs text-[var(--mika-fg-subtle)]">
            File import phải có đúng 5 cột dữ liệu: <strong>vocabulary</strong>, <strong>meaning</strong>,{" "}
            <strong>pos</strong>, <strong>class</strong>, <strong>example</strong>.
            <br />
            Số lượng sheet là tùy ý (1 sheet hoặc nhiều sheet đều được). Mỗi sheet có thể là một chủ đề riêng.
          </p>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-4">
        <p className="text-base font-semibold text-[var(--mika-fg)]">Ví dụ</p>
        <div className="mt-2 rounded-lg border border-[color:var(--mika-border)] bg-[var(--mika-surface-muted)] p-3">
          <p className="text-sm font-semibold text-[var(--mika-fg)]">Từ vựng toeic 900+ đa dạng chủ đề</p>
          <p className="mt-1 text-xs text-[var(--mika-fg-subtle)]">Share bởi khoa · 14:04:13 4/4/2026</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/excel"
              className="rounded-lg border border-[color:var(--mika-border-strong)] px-3 py-2 text-sm text-[var(--mika-fg)] hover:bg-white/5"
            >
              Mở mẫu
            </Link>
            <Link
              href="/excel"
              className="rounded-lg border border-[color:var(--mika-border-strong)] px-3 py-2 text-sm text-[var(--mika-fg)] hover:bg-white/5"
            >
              Download
            </Link>
            <Link href="/excel" className="rounded-lg bg-[#E50914] px-3 py-2 text-sm font-semibold text-white hover:bg-[#f40612]">
              Đồng bộ vào từ vựng
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-4 rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-4">
        <p className="text-sm font-semibold text-[var(--mika-fg)]">Hướng dẫn dùng web</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--mika-fg-muted)]">
          <li>
            Vào <Link href="/flashcards" className="text-[#E50914] underline">Thêm từ / Import</Link> để import file Excel hoặc link Google
            Sheets.
          </li>
          <li>
            Vào <Link href="/vocabulary" className="text-[#E50914] underline">Từ vựng</Link> để kiểm tra danh sách đã đồng bộ.
          </li>
          <li>
            Bắt đầu học: <Link href="/study" className="text-[#E50914] underline">Học thẻ</Link> →{" "}
            <Link href="/quiz" className="text-[#E50914] underline">Quiz topic</Link> →{" "}
            <Link href="/fishing" className="text-[#E50914] underline">Câu cá</Link>.
          </li>
          <li>
            Theo dõi tiến độ tại <Link href="/leaderboard" className="text-[#E50914] underline">BXH</Link> và{" "}
            <Link href="/profile" className="text-[#E50914] underline">Trang cá nhân</Link>.
          </li>
        </ol>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href="/study" className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-3 text-center text-sm font-semibold hover:bg-white/5">
          Học thẻ
        </Link>
        <Link href="/quiz" className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-3 text-center text-sm font-semibold hover:bg-white/5">
          Quiz topic
        </Link>
        <Link href="/fishing" className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-3 text-center text-sm font-semibold hover:bg-white/5">
          Câu cá
        </Link>
        <Link href="/leaderboard" className="rounded-xl border border-[color:var(--mika-border)] bg-[var(--mika-surface)] p-3 text-center text-sm font-semibold hover:bg-white/5">
          BXH
        </Link>
      </section>
    </div>
  );
}
