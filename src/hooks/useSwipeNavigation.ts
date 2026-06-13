import { useRef, type TouchEvent } from "react";

interface SwipeOptions {
  // Called when the user swipes the finger to the left (right-to-left).
  onSwipeLeft?: (() => void) | null;
  // Called when the user swipes the finger to the right (left-to-right).
  onSwipeRight?: (() => void) | null;
  // Minimum horizontal distance (px) required to count as a swipe.
  threshold?: number;
}

// Lightweight touch-only swipe detector. Returns spreadable handlers for the
// element you want to make swipeable. Ignores swipes that start inside inputs,
// textareas, or zoomable image regions, and only fires when horizontal motion
// clearly dominates vertical motion (so vertical scrolling still works).
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
}: SwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const isInteractive = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return !!target.closest(
      "input, textarea, select, [contenteditable='true'], .react-transform-wrapper, [data-no-swipe]",
    );
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1 || isInteractive(e.target)) {
      start.current = null;
      return;
    }
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const origin = start.current;
    start.current = null;
    if (!origin) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - origin.x;
    const dy = t.clientY - origin.y;
    if (Math.abs(dx) < threshold) return;
    if (Math.abs(dx) <= Math.abs(dy)) return; // vertical-dominant -> ignore
    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  };

  return { onTouchStart, onTouchEnd };
}
