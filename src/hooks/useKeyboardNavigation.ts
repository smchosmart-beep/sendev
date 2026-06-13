import { useEffect } from "react";

interface KeyboardNavOptions {
  // Called when the user presses the Left arrow key.
  onArrowLeft?: (() => void) | null;
  // Called when the user presses the Right arrow key.
  onArrowRight?: (() => void) | null;
}

// Document-level keyboard navigation. Fires the matching callback when the user
// presses the Left/Right arrow keys. Ignores key events while typing in inputs,
// textareas, selects, or contenteditable regions so editing isn't disrupted.
export function useKeyboardNavigation({
  onArrowLeft,
  onArrowRight,
}: KeyboardNavOptions) {
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return !!target.closest(
        "input, textarea, select, [contenteditable='true']",
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      if (e.key === "ArrowLeft" && onArrowLeft) {
        onArrowLeft();
      } else if (e.key === "ArrowRight" && onArrowRight) {
        onArrowRight();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onArrowLeft, onArrowRight]);
}
