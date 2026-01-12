import Image from 'next/image';
import { UpgradeFieldBg } from './assets/upgrade-field-bg';
import { Button } from '../shared/Button';
import { ItemSlot } from '../shared/ItemSlot';
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import type {
  IInventoryItem,
  InventoryFilterType,
} from '@/lib/types/Inventory';

interface UpgradeFormProps {
  onCancel?: () => void;
}

export function UpgradeForm({ onCancel }: UpgradeFormProps) {
  // State for each slot
  const [gearSlot, setGearSlot] = useState<IInventoryItem | null>(null);
  const [soulGemSlot, setSoulGemSlot] = useState<IInventoryItem | null>(null);
  const [commonResourceSlot, setCommonResourceSlot] =
    useState<IInventoryItem | null>(null);
  const [uncommonResourceSlot, setUncommonResourceSlot] =
    useState<IInventoryItem | null>(null);
  const [uniqueResourceSlot, setUniqueResourceSlot] =
    useState<IInventoryItem | null>(null);

  const [upgradeChance, setUpgradeChance] = useState(48);
  const cost = 1234;

  // Recalculate upgrade chance when soul gem changes
  useEffect(() => {
    let chance = 48; // base chance
    if (soulGemSlot) {
      // Add bonus from soul gem (e.g., +20%)
      chance += 20;
    }
    setUpgradeChance(Math.min(chance, 100)); // Maximum 100%
  }, [soulGemSlot]);

  const handleClearAll = useCallback(() => {
    setGearSlot(null);
    setSoulGemSlot(null);
    setCommonResourceSlot(null);
    setUncommonResourceSlot(null);
    setUniqueResourceSlot(null);
  }, []);

  const handleCraft = useCallback(() => {
    // Check that all required slots are filled
    if (!gearSlot) {
      alert('Please place gear first');
      return;
    }
    // TODO: Add craft logic
  }, [
    gearSlot,
    soulGemSlot,
    commonResourceSlot,
    uncommonResourceSlot,
    uniqueResourceSlot,
    upgradeChance,
    cost,
  ]);

  const steps = useMemo(
    () => [
      {
        title: '1. Place your gear',
      },
      {
        title: '2. Place crafting materials mentioned on gear for improvement',
      },
      {
        title: '3. To increase your % of crafting success add soul gem',
      },
      {
        title: '4. Click "craft"',
      },
    ],
    []
  );

  const buttonClassName =
    'flex h-16 w-auto flex-row items-center gap-2.5 px-6 transition-al -mt-4';

  const armorTypes = useMemo<InventoryFilterType[]>(() => ['armor'], []);
  const gemsTypes = useMemo<InventoryFilterType[]>(() => ['gems'], []);
  const craftTypes = useMemo<InventoryFilterType[]>(() => ['craft'], []);

  return (
    <div className="relative flex h-full flex-col pb-5">
      {/* Content */}
      <div className="relative flex h-full w-full flex-col gap-5">
        {/* Content */}
        <div className="text-main-gray font-pixel flex flex-1 flex-col overflow-hidden">
          <div className="flex h-full flex-col gap-2.5">
            {/* Upgrade content goes here */}
            <div className="h-110 relative w-full bg-[#ACB0BC]">
              {/* Background overlay */}
              <UpgradeFieldBg className="absolute inset-0 z-10 h-full w-full" />

              {/* Inner content */}
              <div className="relative z-20 flex h-full w-full flex-col p-1">
                {/* Header with upgrade chance */}
                <div className="flex w-full items-center justify-center text-center text-base font-bold">
                  Upgrade chance: {upgradeChance}%
                </div>

                {/* Main crafting area */}
                <div className="justyfy-between mb-5 flex flex-1 flex-col justify-between">
                  <div className="flex gap-2.5">
                    <div className="ml-28">
                      <ItemSlot
                        item={gearSlot}
                        placeholder="/inventory/craft/default/gear.png"
                        placeholderAlt="gear-placeholder"
                        onItemDrop={setGearSlot}
                        onItemRemove={() => setGearSlot(null)}
                        label="Gear"
                      />
                    </div>
                    <div className="ml-32">
                      <ItemSlot
                        item={soulGemSlot}
                        placeholder="/inventory/craft/default/soul-gem.png"
                        placeholderAlt="soul-gem-placeholder"
                        onItemDrop={setSoulGemSlot}
                        onItemRemove={() => setSoulGemSlot(null)}
                        label="Soul gem"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <div className="ml-15">
                      <ItemSlot
                        item={commonResourceSlot}
                        placeholder="/inventory/craft/default/common-resource.png"
                        placeholderAlt="resource-placeholder"
                        onItemDrop={setCommonResourceSlot}
                        onItemRemove={() => setCommonResourceSlot(null)}
                        label="Common resource"
                      />
                    </div>
                    <div className="ml-15">
                      <ItemSlot
                        item={gearSlot} // Display result (same gear)
                        placeholder="/inventory/craft/default/upgrade-result.png"
                        placeholderAlt="result-placeholder"
                        label="Result"
                        className="pointer-events-none opacity-70"
                      />
                    </div>
                    <div className="ml-15">
                      <ItemSlot
                        item={uniqueResourceSlot}
                        placeholder="/inventory/craft/default/unique-resource.png"
                        placeholderAlt="resource-placeholder"
                        onItemDrop={setUniqueResourceSlot}
                        onItemRemove={() => setUniqueResourceSlot(null)}
                        label="Unique resource"
                      />
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-center">
                    <ItemSlot
                      item={uncommonResourceSlot}
                      placeholder="/inventory/craft/default/uncommon-resource.png"
                      placeholderAlt="resource-placeholder"
                      onItemDrop={setUncommonResourceSlot}
                      onItemRemove={() => setUncommonResourceSlot(null)}
                      label="Uncommon resource"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-base">
              <div className="mb-2 flex w-full items-center justify-between">
                <span>Upgrade gear</span>
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
              <div className="mb-2">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="mb-1 flex w-full items-center justify-between"
                  >
                    <span className="text-sm">{step.title}</span>
                  </div>
                ))}
              </div>
              <div>
                <span className="text-main-gray text-xs font-extralight">
                  If the forging fails, you lose your money and soul gems
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
