'use client';

import { useState } from 'react';
import { SelectWithLabel } from '../shared/Select/SelectWithLabel';
import { InputWithLabel } from '../shared/Input/InputWithLabel';

const SORT_OPTIONS = [
  { value: 'gold', label: 'Only for gold' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest first' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'crafting', label: 'Crafting Items' },
  { value: 'crystals', label: 'Crystals' },
  { value: 'gear_archer', label: 'Gear: Archer' },
  { value: 'gear_duelist', label: 'Gear: Duelist' },
  { value: 'gear_sorcerer', label: 'Gear: Sorcerer' },
];

export function BuyItemsFilterPanel() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('gold');
  const [category, setCategory] = useState('all');

  return (
    <div className="flex w-full flex-col gap-4">
      <InputWithLabel
        label="Search Item"
        value={search}
        onChange={setSearch}
        placeholder="What you like to buy?"
      />
      <SelectWithLabel
        label="Short by"
        options={SORT_OPTIONS}
        value={sortBy}
        onChange={setSortBy}
      />
      <SelectWithLabel
        label="Category"
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={setCategory}
      />
    </div>
  );
}
