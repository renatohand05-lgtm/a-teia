let running: Promise<unknown> | null = null;

export async function withCronLock<T>(fn: () => Promise<T>): Promise<{ skipped: true } | { skipped: false; result: T }> {
  if (running) return { skipped: true };
  const task = fn();
  running = task.finally(() => {
    running = null;
  });
  const result = (await running) as T;
  return { skipped: false, result };
}

export function resetCronLockForTests() {
  running = null;
}
