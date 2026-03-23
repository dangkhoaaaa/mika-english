"use client";

import Link from "next/link";

export default function ExcelPage() {
  return (
    <div className="mx-auto max-w-3xl px-3 py-8 sm:px-4">
      <h1 className="mb-2 text-2xl font-bold">
        <span className="text-[#E50914]">Import Excel</span>
      </h1>
      <p className="mb-6 text-zinc-400">
        Định dạng cột: VOCABULARY, POS, CLASS, MEANING, EXAMPLE. Bạn có thể import trực tiếp trong trang{" "}
        <Link href="/flashcards" className="text-[#E50914] underline hover:opacity-90">
          Flashcard
        </Link>
        .
      </p>
      <div className="rounded-xl border border-dashed border-white/20 bg-[#242526] p-8 text-center text-zinc-500">
        Khu vực upload Excel riêng sẽ bổ sung sau (kéo thả file, preview…).
      </div>
    </div>
  );
}
