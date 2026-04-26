import { TOURNAMENT_OPTIMISTIC_RETRY_LIMIT } from './tournament-state.constants.js';

export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}

export function isVersionError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: string }).name === 'VersionError'
  );
}

export async function retryOnVersionConflict<T>(
  fn: () => Promise<T>,
  label: string,
  warn: (message: string) => void,
  maxAttempts: number = TOURNAMENT_OPTIMISTIC_RETRY_LIMIT
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isVersionError(err)) {
        throw err;
      }
      lastErr = err;
      warn(
        `Optimistic concurrency conflict on ${label} (attempt ${attempt}/${maxAttempts}), retrying`
      );
    }
  }
  throw lastErr;
}
