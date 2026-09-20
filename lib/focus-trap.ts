const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusable(root: { querySelectorAll: (selector: string) => ArrayLike<unknown> }): unknown[] {
  return Array.from(root.querySelectorAll(FOCUSABLE));
}

export function nextFocusIndex(current: number, total: number, shiftKey: boolean): number {
  if (total <= 0) return -1;
  if (shiftKey) return current <= 0 ? total - 1 : current - 1;
  return current >= total - 1 ? 0 : current + 1;
}

export function shouldTrapTab(key: string): boolean {
  return key === "Tab";
}

export function shouldCloseOnEscape(key: string): boolean {
  return key === "Escape";
}

export function trapTabKey(
  event: { key: string; shiftKey: boolean; preventDefault: () => void },
  root: {
    querySelectorAll: (selector: string) => ArrayLike<{ focus?: () => void }>;
  },
  active: unknown,
) {
  if (!shouldTrapTab(event.key)) return false;
  const items = getFocusable(root) as Array<{ focus?: () => void }>;
  if (!items.length) {
    event.preventDefault();
    return true;
  }
  const current = items.indexOf(active as { focus?: () => void });
  const next = nextFocusIndex(current < 0 ? 0 : current, items.length, event.shiftKey);
  if (
    current < 0 ||
    (event.shiftKey && current === 0) ||
    (!event.shiftKey && current === items.length - 1)
  ) {
    event.preventDefault();
    items[next]?.focus?.();
    return true;
  }
  return false;
}
