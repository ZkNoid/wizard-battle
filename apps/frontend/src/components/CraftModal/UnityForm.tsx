import Image from 'next/image';
import { UpgradeFieldBg } from './assets/upgrade-field-bg';
import { Button } from '../shared/Button';
import { ItemSlot } from '../shared/ItemSlot';
import { useState, useCallback, useMemo } from 'react';
import type {
  IInventoryItem,
  InventoryFilterType,
} from '@/lib/types/Inventory';

interface UnityFormProps {
  onCancel?: () => void;
}

export function UnityForm({ onCancel }: UnityFormProps) {
  // State for each gem slot
  const [gemSlot1, setGemSlot1] = useState<IInventoryItem | null>(null);
  const [gemSlot2, setGemSlot2] = useState<IInventoryItem | null>(null);
  const [gemSlot3, setGemSlot3] = useState<IInventoryItem | null>(null);
  const [gemSlot4, setGemSlot4] = useState<IInventoryItem | null>(null);
  const [gemSlot5, setGemSlot5] = useState<IInventoryItem | null>(null);

  const cost = 500;

  const handleClearAll = useCallback(() => {
    setGemSlot1(null);
    setGemSlot2(null);
    setGemSlot3(null);
    setGemSlot4(null);
    setGemSlot5(null);
  }, []);

  const handleCraft = useCallback(() => {
    // Check that at least some gems are placed
    if (!gemSlot1 && !gemSlot2 && !gemSlot3 && !gemSlot4 && !gemSlot5) {
      alert('Please place at least one gem');
      return;
    }
    // TODO: Add unite logic
  }, [gemSlot1, gemSlot2, gemSlot3, gemSlot4, gemSlot5, cost]);

  const steps = useMemo(
    () => [
      {
        title: '1. Place gems you want to unite',
      },
      {
        title: '2. Click "unite" to combine them',
      },
    ],
    []
  );

  const buttonClassName =
    'flex h-12 w-auto flex-row items-center gap-2.5 px-6 transition-al -mt-4';

  const gemsTypes = useMemo<InventoryFilterType[]>(() => ['gems'], []);

  return (
    <div className="relative flex h-full flex-col">
      {/* Content */}
      <div className="relative flex h-full w-full flex-col gap-5">
        {/* Content */}
        <div className="text-main-gray font-pixel flex flex-1 flex-col overflow-hidden">
          <div className="flex h-full flex-col gap-2.5">
            {/* Unite content goes here */}
            <div className="h-110 relative w-full bg-[#ACB0BC]">
              {/* Background overlay */}
              <UpgradeFieldBg className="absolute inset-0 z-10 h-full w-full" />

              {/* Inner content */}
              <div className="relative z-20 flex h-full w-full flex-col p-1">
                {/* Main crafting area */}
                <div className="justyfy-between mb-5 mt-5 flex flex-1 flex-col justify-between">
                  <div className="flex gap-2.5">
                    <div className="ml-28">
                      <ItemSlot
                        item={gemSlot1}
                        placeholder="/inventory/craft/default/soul-gem.png"
                        placeholderAlt="gem-placeholder"
                        onItemDrop={setGemSlot1}
                        onItemRemove={() => setGemSlot1(null)}
                        acceptedTypes={gemsTypes}
                        label="Gem"
                      />
                    </div>
                    <div className="ml-32">
                      <ItemSlot
                        item={gemSlot2}
                        placeholder="/inventory/craft/default/soul-gem.png"
                        placeholderAlt="gem-placeholder"
                        onItemDrop={setGemSlot2}
                        onItemRemove={() => setGemSlot2(null)}
                        acceptedTypes={gemsTypes}
                        label="Gem"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="ml-15">
                      <ItemSlot
                        item={gemSlot3}
                        placeholder="/inventory/craft/default/soul-gem.png"
                        placeholderAlt="gem-placeholder"
                        onItemDrop={setGemSlot3}
                        onItemRemove={() => setGemSlot3(null)}
                        acceptedTypes={gemsTypes}
                        label="Gem"
                      />
                    </div>
                    <div className="ml-15">
                      <ItemSlot
                        item={gemSlot1} // Display result (upgraded gem)
                        placeholder="/inventory/craft/default/upgrade-result.png"
                        placeholderAlt="result-placeholder"
                        label="Result"
                        className="pointer-events-none opacity-70"
                      />
                    </div>
                    <div className="ml-15">
                      <ItemSlot
                        item={gemSlot4}
                        placeholder="/inventory/craft/default/soul-gem.png"
                        placeholderAlt="gem-placeholder"
                        onItemDrop={setGemSlot4}
                        onItemRemove={() => setGemSlot4(null)}
                        acceptedTypes={gemsTypes}
                        label="Gem"
                      />
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-center">
                    <ItemSlot
                      item={gemSlot5}
                      placeholder="/inventory/craft/default/soul-gem.png"
                      placeholderAlt="gem-placeholder"
                      onItemDrop={setGemSlot5}
                      onItemRemove={() => setGemSlot5(null)}
                      acceptedTypes={gemsTypes}
                      label="Gem"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-base">
              <div className="mb-2 flex w-full items-center justify-between">
                <span>Unite soul gems</span>
                <span className="flex items-center gap-1">
                  <span>Cost: {cost}</span>
                  <Image
                    src="/icons/gold-coin.png"
                    width={16}
                    height={16}
                    alt="gold-coin"
                    className="size-4 object-contain object-center"
                  />
                </span>
              </div>
              <div className="mb-2 flex w-full items-center justify-between">
                <span className="text-sm">
                  To get a higher-level soul gem, place five identical soul gems
                  of a lower level in the cells and click &quot;craft&quot;.
                </span>
              </div>
              <div>
                <span className="text-main-gray text-xs font-extralight">
                  Soul gems used to increase the chances of armor upgrades. They
                  have 5 levels. higher-level stones increase gear crafting
                  success by more %.
                </span>
              </div>
            </div>
            <div className="mt-auto flex w-full justify-between">
              <div>
                <Button
                  variant="red"
                  className={buttonClassName}
                  onClick={onCancel}
                >
                  <span className="text-white">Cancel</span>
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="gray"
                  className={buttonClassName}
                  onClick={handleClearAll}
                >
                  Clear
                </Button>
                <Button
                  variant="green"
                  className={buttonClassName}
                  onClick={handleCraft}
                >
                  Craft
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
