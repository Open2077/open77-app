"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VISIBLE_MS = 2600;
const FADE_MS = 250;

/**
 * A single transient status message.
 *
 * Announced politely rather than assertively: every message this site shows is
 * an explanation of something that is not built yet, not an error the reader has
 * to act on immediately.
 */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  const show = useCallback(
    (next: string) => {
      clear();
      setMessage(next);
      setVisible(true);
      timers.current.push(
        setTimeout(() => setVisible(false), VISIBLE_MS),
        setTimeout(() => setMessage(null), VISIBLE_MS + FADE_MS),
      );
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  const node = (
    <div
      className={`toast${visible ? " is-visible" : ""}`}
      id="toast"
      role="status"
      aria-live="polite"
      hidden={message === null}
    >
      {message}
    </div>
  );

  return { show, node };
}
