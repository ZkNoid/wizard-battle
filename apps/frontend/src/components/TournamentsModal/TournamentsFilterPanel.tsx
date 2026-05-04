'use client';

import {
  TOURNAMENTS_FILTER_BY_OPTIONS,
  type TournamentListView,
} from '@/lib/constants/tournaments';
import { SelectWithLabel } from '../shared/Select/SelectWithLabel';

export interface TournamentsFilters {
  view: TournamentListView;
}

interface TournamentsFilterPanelProps {
  filters: TournamentsFilters;
  onFiltersChange: (filters: TournamentsFilters) => void;
}

export function TournamentsFilterPanel({
  filters,
  onFiltersChange,
}: TournamentsFilterPanelProps) {
  return (
    <div className="flex w-full items-end gap-4">
      <div className="w-100">
        <SelectWithLabel
          label="Filter"
          options={TOURNAMENTS_FILTER_BY_OPTIONS}
          value={filters.view}
          className="w-100"
          onChange={(view) =>
            onFiltersChange({ ...filters, view: view as TournamentListView })
          }
        />
      </div>
    </div>
  );
}
