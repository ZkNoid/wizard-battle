'use client';

import { Button } from '../shared/Button';

export function BuyItemsFilterPanel() {
  return (
    <div className="flex w-full flex-row">
      <Button variant="gray" className="flex-1">
        All
      </Button>
    </div>
  );
}
