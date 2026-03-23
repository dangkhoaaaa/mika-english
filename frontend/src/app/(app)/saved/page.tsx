"use client";

import { useCallback, useEffect, useState } from "react";
import { api, setAuthToken } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { mapVocabFromApi } from "@/lib/vocabFromApi";
import type { VocabularyItem } from "@/lib/types";
import { speakEnglish, speakVietnamese } from "@/lib/speech";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type ReminderDto = {
  id?: string;
  notifyEmail: string;
  schedule: string;
  hour: number;
  minute: number;
  weekday: number;
  vocabularyIds: string[];
  enabled: boolean;
  nextRunAt?: string;
};

const WEEKDAYS = [
  { v: 0, label: "Chủ nhật" },
  { v: 1, label: "Thứ hai" },
  { v: 2, label: "Thứ ba" },
  { v: 3, label: "Thứ tư" },
  { v: 4, label: "Thứ năm" },
  { v: 5, label: "Thứ sáu" },
  { v: 6, label: "Thứ bảy" },
];

export default function SavedVocabularyPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminder, setReminder] = useState<ReminderDto | null>(null);
  const [selectedForMail, setSelectedForMail] = useState<Set<string>>(new Set());
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [savingReminder, setSavingReminder] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setAuthToken(token);
    setLoading(true);
    try {
      const [vRes, rRes] = await Promise.all([
        api.get("/api/v1/bookmarks"),
        api.get<ReminderDto | null>("/api/v1/reminders"),
      ]);
      const list = Array.isArray(vRes.data)
        ? vRes.data.map((row: Record<string, unknown>) => mapVocabFromApi(row))
        : [];
      setItems(list);
      const r = rRes.data;
      setReminder(r);
      if (r?.vocabularyIds?.length) {
        setSelectedForMail(new Set(r.vocabularyIds));
      } else if (list.length) {
        setSelectedForMail(new Set(list.map((x) => x.id)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSelectMail = (id: string) => {
    setSelectedForMail((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const saveReminder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const notifyEmail = String(fd.get("notifyEmail") ?? "").trim();
    const schedule = String(fd.get("schedule") ?? "daily");
    const hour = Number(fd.get("hour") ?? 8);
    const minute = Number(fd.get("minute") ?? 0);
    const weekday = Number(fd.get("weekday") ?? 1);
    const enabled = fd.get("enabled") === "on";
    const vocabularyIds = Array.from(selectedForMail);
    setSavingReminder(true);
    try {
      const res = await api.post<ReminderDto>("/api/v1/reminders", {
        notifyEmail,
        schedule,
        hour,
        minute,
        weekday,
        vocabularyIds,
        enabled,
      });
      setReminder(res.data);
      // đã cập nhật state từ response
    } catch (err) {
      console.error(err);
    } finally {
      setSavingReminder(false);
    }
  };

  const removeBookmark = async (id: string) => {
    try {
      await api.delete(`/api/v1/bookmarks?vocabularyId=${encodeURIComponent(id)}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
      setSelectedForMail((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    } finally {
      setConfirmRemoveId(null);
    }
  };

  const [confirmDeleteReminder, setConfirmDeleteReminder] = useState(false);

  const deleteReminder = async () => {
    try {
      await api.delete("/api/v1/reminders");
      setReminder(null);
      setConfirmDeleteReminder(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-3 py-8 sm:px-4">
      <h1 className="mb-2 text-2xl font-bold">
        <span className="text-[#E50914]">Từ đã lưu</span> (ôn khó)
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Từ bạn đánh dấu từ mục Từ vựng / Học thẻ. Có thể bật nhắc qua email theo lịch.
      </p>

      {loading && <p className="text-zinc-500">Đang tải…</p>}

      <section className="mb-8 space-y-2">
        {!loading && items.length === 0 && (
          <p className="rounded-xl bg-[#242526] p-8 text-center text-zinc-500">
            Chưa có từ nào được lưu. Vào <strong className="text-white">Từ vựng</strong> hoặc{" "}
            <strong className="text-white">Học thẻ</strong> và bấm &quot;Lưu từ&quot;.
          </p>
        )}
        {items.map((item) => (
          <article
            key={item.id}
            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#242526] p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              {item.topic ? (
                <p className="mb-1 inline-block rounded bg-[#E50914]/20 px-2 py-0.5 text-xs text-[#E50914]">
                  {item.topic}
                </p>
              ) : null}
              <p className="font-semibold text-white">{item.vocabulary}</p>
              <p className="text-sm text-zinc-400">{item.meaning}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-[#3a3b3c] px-2 py-1 text-xs text-zinc-200 hover:bg-[#4e4f50]"
                  onClick={() => speakEnglish(item.vocabulary)}
                >
                  🔊 EN
                </button>
                <button
                  type="button"
                  className="rounded bg-[#3a3b3c] px-2 py-1 text-xs text-zinc-200 hover:bg-[#4e4f50]"
                  onClick={() => speakVietnamese(item.meaning)}
                >
                  🔊 VI
                </button>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={selectedForMail.has(item.id)}
                    onChange={() => toggleSelectMail(item.id)}
                  />
                  Gửi trong mail nhắc
                </label>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:bg-white/5"
              onClick={() => setConfirmRemoveId(item.id)}
            >
              Bỏ lưu
            </button>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#181818] p-5">
        <h2 className="text-lg font-semibold text-white">Nhắc qua email</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Cấu hình SMTP trên server (SMTP_HOST, SMTP_USER, …). Không cấu hình thì lịch vẫn chạy nhưng không gửi được mail.
        </p>
        <form
          key={reminder ? `${reminder.notifyEmail}-${reminder.schedule}-${reminder.hour}` : "new"}
          className="mt-4 space-y-4"
          onSubmit={(e) => void saveReminder(e)}
        >
          <div>
            <label className="text-sm text-zinc-400">Email nhận nhắc</label>
            <input
              name="notifyEmail"
              type="email"
              required
              defaultValue={reminder?.notifyEmail ?? ""}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
              placeholder="you@example.com"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-zinc-400">Tần suất</label>
              <select
                name="schedule"
                defaultValue={reminder?.schedule ?? "daily"}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
              >
                <option value="hourly">Mỗi giờ</option>
                <option value="daily">Mỗi ngày</option>
                <option value="weekly">Mỗi tuần</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm text-zinc-400">Giờ</label>
                <input
                  name="hour"
                  type="number"
                  min={0}
                  max={23}
                  defaultValue={reminder?.hour ?? 8}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-zinc-400">Phút</label>
                <input
                  name="minute"
                  type="number"
                  min={0}
                  max={59}
                  defaultValue={reminder?.minute ?? 0}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm text-zinc-400">Ngày trong tuần (chỉ khi &quot;Mỗi tuần&quot;)</label>
            <select
              name="weekday"
              defaultValue={reminder?.weekday ?? 1}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#3a3b3c] px-3 py-2 text-sm text-white"
            >
              {WEEKDAYS.map((d) => (
                <option key={d.v} value={d.v}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="enabled" defaultChecked={reminder?.enabled !== false} />
            Bật nhắc tự động
          </label>
          {reminder?.nextRunAt && (
            <p className="text-xs text-zinc-500">
              Lần chạy tiếp (UTC): {new Date(reminder.nextRunAt).toLocaleString("vi-VN")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={savingReminder || items.length === 0}
              className="rounded-lg bg-[#E50914] px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {savingReminder ? "Đang lưu…" : "Lưu lịch nhắc"}
            </button>
            {reminder && (
              <button
                type="button"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                onClick={() => setConfirmDeleteReminder(true)}
              >
                Xóa lịch nhắc
              </button>
            )}
          </div>
        </form>
      </section>

      <ConfirmModal
        open={!!confirmRemoveId}
        title="Bỏ lưu từ này?"
        message="Từ sẽ gỡ khỏi danh sách từ đã lưu."
        confirmLabel="Bỏ lưu"
        onConfirm={() => confirmRemoveId && void removeBookmark(confirmRemoveId)}
        onCancel={() => setConfirmRemoveId(null)}
      />
      <ConfirmModal
        open={confirmDeleteReminder}
        title="Xóa lịch nhắc mail?"
        message="Bạn sẽ không còn nhận email nhắc từ (có thể tạo lại sau)."
        confirmLabel="Xóa lịch"
        onConfirm={() => void deleteReminder()}
        onCancel={() => setConfirmDeleteReminder(false)}
      />
    </div>
  );
}
