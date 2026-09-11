// Activity-driven renewal, shared by web and native. There is deliberately no
// timer: an idle app must not keep a login alive. Concurrent requests share one
// renewal, and failed activity renewals are throttled too (e.g. when offline).
export const SESSION_ACTIVITY_INTERVAL_MS = 60_000;

export function createSessionRefresher<T>(renew: () => Promise<T>) {
  let pending: Promise<T> | null = null;
  let lastAttemptAt = -Infinity;

  function refresh(): Promise<T> {
    if (pending) return pending;
    lastAttemptAt = Date.now();
    pending = Promise.resolve().then(renew).finally(() => { pending = null; });
    return pending;
  }

  return {
    refresh,
    activity() {
      if (Date.now() - lastAttemptAt >= SESSION_ACTIVITY_INTERVAL_MS) {
        void refresh().catch(() => { /* The caller handles invalid credentials. */ });
      }
    },
    async settled() {
      await pending?.catch(() => {});
    },
  };
}
