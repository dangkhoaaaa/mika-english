"use client";

import { useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type IncentiveDto = {
  notifyEmail: string;
  enabled: boolean;
  intervalsDays: number[];
};

export default function MotivationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [notifyEmail, setNotifyEmail] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [interval7, setInterval7] = useState(true);
  const [interval30, setInterval30] = useState(true);

  const load = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<IncentiveDto | null>("/api/v1/incentive/me");
      const d = res.data;
      if (!d) return;
      setNotifyEmail(String(d.notifyEmail ?? ""));
      setEnabled(Boolean(d.enabled ?? true));
      const intervals = Array.isArray(d.intervalsDays) ? d.intervalsDays : [];
      setInterval7(intervals.includes(7));
      setInterval30(intervals.includes(30));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Tải thất bại");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const save = async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const intervals = [
        interval7 ? 7 : null,
        interval30 ? 30 : null,
      ].filter((x): x is number => x !== null);
      if (!notifyEmail.trim()) {
        throw new Error("Bạn cần nhập email nhận nhắc.");
      }
      if (intervals.length === 0) {
        throw new Error("Chọn ít nhất 1 mốc ngày (7 hoặc 30).");
      }
      await api.post("/api/v1/incentive/me", {
        notifyEmail: notifyEmail.trim(),
        enabled,
        intervalsDays: intervals,
      });
      setSuccess("Đã lưu cấu hình động lực.");
      await load();
    } catch (e: any) {
      setError(e?.message ?? e?.response?.data?.error ?? "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1300px] px-3 py-16 text-center sm:px-4">
        <p className="text-zinc-500">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1300px] px-3 py-8 sm:px-4">
      <h1 className="mb-2 text-2xl font-bold">
        <span className="text-[#E50914]">Động lực</span> (nhắc mail inactivity)
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Nếu bạn không quiz/check-in trong thời gian quy định, hệ thống sẽ tự gửi email nhắc học lại.
      </p>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-100">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-100">
          {success}
        </div>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-[#242526] p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400">Email nhận nhắc</label>
            <input
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              type="email"
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
              placeholder="you@example.com"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Bật nhắc động lực
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#18191a] px-3 py-2 text-sm text-zinc-300">
              <input type="checkbox" checked={interval7} onChange={(e) => setInterval7(e.target.checked)} />
              Sau 7 ngày không hoạt động
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#18191a] px-3 py-2 text-sm text-zinc-300">
              <input type="checkbox" checked={interval30} onChange={(e) => setInterval30(e.target.checked)} />
              Sau 30 ngày không hoạt động
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f40612] disabled:opacity-50"
            >
              {saving ? "Đang lưu…" : "Lưu cấu hình"}
            </button>
          </div>

          <div className="text-xs text-zinc-500">
            Lưu ý: “Không hoạt động” được tính theo các hành động hiện có (quiz & điểm danh). Nếu bạn muốn tính cả khi vào Study/Vocabulary, mình sẽ thêm cơ chế “ping activity” từ FE.
          </div>
        </div>
      </section>
    </div>
  );
}

