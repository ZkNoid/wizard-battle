'use client';

import { useState } from 'react';
import { Select } from '../shared/Select';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'crafting', label: 'Crafting Items' },
  { value: 'crystals', label: 'Crystals' },
  { value: 'gear_archer', label: 'Gear: Archer' },
  { value: 'gear_duelist', label: 'Gear: Duelist' },
  { value: 'gear_sorcerer', label: 'Gear: Sorcerer' },
];

export function BuyItemsFilterPanel() {
  const [category, setCategory] = useState('all');

  return (
    <div className="flex w-full flex-row">
      <div className="w-100">
        <Select
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={setCategory}
        />
      </div>
    </div>
  );
}
