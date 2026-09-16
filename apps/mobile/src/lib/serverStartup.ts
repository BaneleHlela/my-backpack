// Retry only the read-only health check, never a login or other mutation.
export async function waitForServerStartup(
  probe: (timeout: number) => Promise<boolean>,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<void> {
  const deadline = now() + 120_000;
  while (now() < deadline) {
    if (await probe(Math.min(15_000, deadline - now()))) return;
    const remaining = deadline - now();
    if (remaining > 0) await sleep(Math.min(3_000, remaining));
  }
  throw new Error('Unable to reach the server. It may still be starting. Check your internet connection and try again.');
}
