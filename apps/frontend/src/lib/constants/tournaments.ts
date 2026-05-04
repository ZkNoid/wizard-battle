/** Dropdown values for tournament list view (filter + sort). */
export type TournamentListView =
  | 'all'
  | 'end_within_24h'
  | 'end_within_week'
  | 'start_within_24h'
  | 'start_within_week'
  | 'rewards_small_to_big'
  | 'rewards_big_to_small'
  | 'only_usdc';

export const TOURNAMENTS_FILTER_BY_OPTIONS: {
  value: TournamentListView;
  label: string;
}[] = [
  { value: 'all', label: 'All' },
  { value: 'end_within_24h', label: 'Will end within 24 hours' },
  { value: 'end_within_week', label: 'Will end within a week' },
  { value: 'start_within_24h', label: 'Will start within 24 hours' },
  { value: 'start_within_week', label: 'Will start within a week' },
  { value: 'rewards_small_to_big', label: 'Rewards: From small to big' },
  { value: 'rewards_big_to_small', label: 'Rewards: From big to small' },
  { value: 'only_usdc', label: 'Only for USDC' },
];
