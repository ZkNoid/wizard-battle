import type { OptimisticView, TournamentSponsor } from './tournament-state.types.js';

type DisplaySlice = Partial<
  Pick<OptimisticView, 'title' | 'imageUrl' | 'description' | 'sponsors'>
>;

/** Omits empty/falsy values so API payloads and DB documents stay minimal. */
export function optionalTournamentDisplayFields(
  title?: string,
  imageUrl?: string,
  description?: string,
  sponsors?: TournamentSponsor[],
): DisplaySlice {
  const out: DisplaySlice = {};
  if (title !== undefined && title !== '') out.title = title;
  if (imageUrl !== undefined && imageUrl !== '') out.imageUrl = imageUrl;
  if (description !== undefined && description !== '') out.description = description;
  if (sponsors !== undefined && sponsors.length > 0) out.sponsors = sponsors;
  return out;
}
