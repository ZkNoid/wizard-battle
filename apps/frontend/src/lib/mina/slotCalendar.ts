/**
 * Nominal Mina slot step in milliseconds (~3 minutes), used across the repo
 * (e.g. mina-contracts create-tournament: 200 slots ≈ 10 hours).
 * Actual block times vary slightly; this is fine for calendar-day UI.
 */
export const MINA_MS_PER_SLOT = 3 * 60 * 1000;

export interface MinaSlotAnchor {
  slot: number;
  timeMs: number;
}

/** `YYYY-MM-DD` in local time, matching {@link formatTournamentDate} consumers. */
export function slotToCalendarDate(
  targetSlot: number,
  anchor: MinaSlotAnchor
): string {
  const ms =
    anchor.timeMs + (targetSlot - anchor.slot) * MINA_MS_PER_SLOT;
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
