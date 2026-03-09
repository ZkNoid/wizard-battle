export function formatTournamentDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
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
