'use client';

import { TOURNAMENTS_FILTER_BY_OPTIONS } from '@/lib/constants/tournaments';
import { SelectWithLabel } from '../shared/Select/SelectWithLabel';

export interface TournamentsFilters {
  sortBy: string;
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
          label="Sort by"
          options={TOURNAMENTS_FILTER_BY_OPTIONS}
          value={filters.sortBy}
          className="w-100"
          onChange={(sortBy) => onFiltersChange({ ...filters, sortBy })}
        />
      </div>
    </div>
  );
}
