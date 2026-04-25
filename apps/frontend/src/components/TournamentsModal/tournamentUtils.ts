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
