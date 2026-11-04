export type WriteOutcome = 'synced' | 'queued';

// Firestore keeps writes made while offline in its persistent cache and replays
// them on reconnect, but the returned promise only settles once the server
// confirms. This helper lets the UI move on after a short grace period and
// report the write as "queued" instead of hanging on a spinner.
export async function commitWithOfflineGrace(
  operation: Promise<unknown>,
  options: { graceMs?: number; onLateError?: (error: unknown) => void } = {}
): Promise<WriteOutcome> {
  const { graceMs = 3000, onLateError } = options;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  const timeout = new Promise<'timeout'>(resolve => {
    timer = setTimeout(() => {
      timedOut = true;
      resolve('timeout');
    }, graceMs);
  });

  const guarded = operation.then(
    () => 'done' as const,
    error => {
      if (timedOut) {
        onLateError?.(error);
        return 'done' as const;
      }
      throw error;
    }
  );

  try {
    const result = await Promise.race([guarded, timeout]);
    return result === 'timeout' ? 'queued' : 'synced';
  } finally {
    if (timer) clearTimeout(timer);
  }
}
