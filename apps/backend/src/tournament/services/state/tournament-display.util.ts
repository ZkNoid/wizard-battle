import type { OptimisticView } from './tournament-state.types.js';

type DisplaySlice = Partial<Pick<OptimisticView, 'title' | 'imageUrl'>>;

/** Omits empty strings so API payloads stay minimal. */
export function optionalTournamentDisplayFields(
  title?: string,
  imageUrl?: string
): DisplaySlice {
  const out: DisplaySlice = {};
  if (title !== undefined && title !== '') {
    out.title = title;
  }
  if (imageUrl !== undefined && imageUrl !== '') {
    out.imageUrl = imageUrl;
  }
  return out;
}
