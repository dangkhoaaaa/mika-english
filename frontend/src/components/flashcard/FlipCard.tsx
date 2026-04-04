"use client";

import { useRef } from "react";

type Props = {
  showFront: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
  onFlip: () => void;
  disabled?: boolean;
  /** Vuốt trái (kéo ngón tay sang trái) → thẻ sau */
  onSwipeNext?: () => void;
  /** Vuốt phải → thẻ trước */
  onSwipePrev?: () => void;
};

/**
 * Lật 3D — dùng div + style inline để tránh lỗi backface / Tailwind với button lồng nhau.
 */
const SWIPE_MIN_PX = 48;
const SWIPE_DOMINANCE = 1.15;

export function FlipCard({
  showFront,
  front,
  back,
  onFlip,
  disabled,
  onSwipeNext,
  onSwipePrev,
}: Props) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const blockClickFromSwipeRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled || !touchStartRef.current) {
      touchStartRef.current = null;
      return;
    }
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!onSwipeNext && !onSwipePrev) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) {
      return;
    }
    blockClickFromSwipeRef.current = true;
    if (dx < 0) onSwipeNext?.();
    else onSwipePrev?.();
  };

  const handleClick = () => {
    if (disabled) return;
    if (blockClickFromSwipeRef.current) {
      blockClickFromSwipeRef.current = false;
      return;
    }
    onFlip();
  };

  return (
    <div
      className="mx-auto w-full max-w-2xl select-none"
      style={{ perspective: "1200px" }}
    >
      <div
        role="button"
        tabIndex={0}
        className="relative min-h-[260px] w-full cursor-pointer touch-pan-y rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#E50914]/70"
        style={{ WebkitTapHighlightColor: "transparent" }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onFlip();
          }
        }}
        aria-label={showFront ? "Xem mặt sau" : "Xem mặt trước"}
      >
        <div
          className="relative h-full min-h-[260px] w-full"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: showFront ? "rotateY(0deg)" : "rotateY(180deg)",
          }}
        >
          {/* Mặt trước */}
          <div
            className="absolute inset-0 flex flex-col justify-center overflow-hidden rounded-2xl border border-[color:var(--mika-border)] bg-gradient-to-br from-[var(--mika-flip-front-from)] to-[var(--mika-flip-front-to)] p-6 shadow-lg"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
            }}
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#E50914]">
              Mặt trước
            </p>
            <div className="text-xl font-semibold leading-snug text-[var(--mika-fg)] sm:text-2xl">{front}</div>
            <p className="mt-6 text-center text-xs text-[var(--mika-fg-subtle)]">Nhấn để lật thẻ</p>
          </div>
          {/* Mặt sau */}
          <div
            className="absolute inset-0 flex flex-col justify-center overflow-hidden rounded-2xl border border-[color:var(--mika-border)] bg-gradient-to-br from-[var(--mika-flip-back-from)] to-[var(--mika-flip-back-to)] p-6 shadow-lg"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--mika-flip-label-back)]">
              Mặt sau
            </p>
            <div className="text-lg leading-relaxed text-[var(--mika-flip-text-back)] sm:text-xl">{back}</div>
            <p className="mt-6 text-center text-xs text-[var(--mika-fg-subtle)]">Nhấn để lật lại</p>
          </div>
        </div>
      </div>
    </div>
  );
}
