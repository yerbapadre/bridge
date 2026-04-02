import { useEffect } from "react";
import { matchesShortcut } from "@/lib/shortcuts";

interface KeyboardShortcutHandler {
  keys: string[];
  handler: (event: KeyboardEvent) => void;
  condition?: () => boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandler[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true";

      if (isInputFocused) {
        // Allow Escape and Cmd+K even in inputs
        if (
          event.key === "Escape" ||
          (event.metaKey && event.key.toLowerCase() === "k")
        ) {
          // Let these through
        } else {
          return;
        }
      }

      // Find matching handler
      for (const { keys, handler, condition, preventDefault = true } of handlers) {
        if (matchesShortcut(event, keys)) {
          // Check condition if provided
          if (condition && !condition()) {
            continue;
          }

          if (preventDefault) {
            event.preventDefault();
          }

          handler(event);
          break; // Only execute first matching handler
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
