"use client";

import { useEffect, useRef } from "react";
import { getFocusable, shouldCloseOnEscape, trapTabKey } from "@/lib/focus-trap";

export function FocusTrap({
  active,
  onEscape,
  children,
}: {
  active: boolean;
  onEscape?: () => void;
  children: React.ReactNode;
}) {
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const root = document.querySelector<HTMLElement>("[data-teia-drawer='true']");
    if (!root) return;
    restore.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = getFocusable(root)[0] as HTMLElement | undefined;
    (first ?? root).focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (shouldCloseOnEscape(event.key)) {
        event.preventDefault();
        onEscape?.();
        return;
      }
      trapTabKey(event, root, document.activeElement);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      restore.current?.focus?.();
    };
  }, [active, onEscape]);

  return children;
}
