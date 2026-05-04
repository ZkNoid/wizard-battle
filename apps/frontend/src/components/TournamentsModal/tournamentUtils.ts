/** Mina chain amounts (ticket, prize pool, balances) use 1e9 atomic units per whole token. */
export const TOURNAMENT_ATOMIC_DECIMALS = 9;
const ATOMIC_SCALE = 10 ** TOURNAMENT_ATOMIC_DECIMALS;

/**
 * Converts an on-chain-style atomic amount to a human-readable number string
 * (e.g. 1_000_000_000 → "1", 1_500_000_000 → "1.5").
 */
export function formatTournamentAtomicAmount(atomicAmount: number): string {
  if (!Number.isFinite(atomicAmount)) return String(atomicAmount);
  const human = atomicAmount / ATOMIC_SCALE;
  return human.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: TOURNAMENT_ATOMIC_DECIMALS,
  });
}

export function formatTournamentDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Local date + time (~3 min slot granularity), aligned with {@link formatTournamentDate} locale. */
export function formatTournamentDateTime(instantMs: number): string {
  return new Date(instantMs).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateRange(dateFrom: string, dateTo: string): string {
  return `${formatTournamentDate(dateFrom)} — ${formatTournamentDate(dateTo)}`;
}

export function formatBattleWindowWithTime(
  battleStartsAtMs: number,
  battleEndsAtMs: number
): string {
  return `${formatTournamentDateTime(battleStartsAtMs)} — ${formatTournamentDateTime(battleEndsAtMs)}`;
}
