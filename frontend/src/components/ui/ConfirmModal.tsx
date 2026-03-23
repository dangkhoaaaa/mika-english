"use client";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Đóng"
        onClick={loading ? undefined : onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-white/10 bg-[#242526] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-400">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              danger ? "bg-red-700 hover:bg-red-600" : "bg-[#E50914] hover:bg-red-700"
            }`}
            onClick={onConfirm}
          >
            {loading ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
