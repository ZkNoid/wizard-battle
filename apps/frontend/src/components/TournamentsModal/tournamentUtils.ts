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

export function formatDateRange(dateFrom: string, dateTo: string): string {
  return `${formatTournamentDate(dateFrom)} — ${formatTournamentDate(dateTo)}`;
}
