'use client';

import { InventoryBg } from './assets/inventory-bg';
import Image from 'next/image';
import type {
  IInventoryArmorItem,
  InventoryFilterType,
  InventoryItemWearableArmorSlot,
  IUserInventoryItem,
} from '@/lib/types/Inventory';
import { ItemBg } from './assets/item-bg';
import { useState, useMemo } from 'react';
import { CharacterBg } from './assets/character-bg';
import { LvlBg } from './assets/lvl-bg';
import { LEVELS_XP, levelFromXp } from '@/lib/constants/levels';
import { InventoryTooltip } from './InventoryTooltip';
import type { IInventoryFilterBtnProps } from './InventoryFilterBtn';
import InventoryFilterBtn from './InventoryFilterBtn';
import { heroStatsConfig } from '@/lib/constants/stat';
import type { IHeroStatConfig, IHeroStats } from '@/lib/types/IHeroStat';
import { useInventoryStore, useUserDataStore, type EquippedSlots } from '@/lib/store';
import { WizardId } from '../../../../common/wizards';
import {
  useModalSound,
  useClickSound,
  useHoverSound,
} from '@/lib/hooks/useAudio';

const MAX_ITEMS = 35;

enum Wizards {
  ARCHER,
  WARRIOR,
  MAGE,
}

// Map UI wizard enum to actual WizardId strings
const getWizardId = (wizard: Wizards): string => {
  switch (wizard) {
    case Wizards.ARCHER:
      return WizardId.ARCHER.toString();
    case Wizards.WARRIOR:
      return WizardId.PHANTOM_DUELIST.toString();
    case Wizards.MAGE:
      return WizardId.MAGE.toString();
  }
};

export default function InventoryModal({ onClose }: { onClose: () => void }) {
  // Play modal sounds
  useModalSound();
  const playClickSound = useClickSound();
  const playHoverSound = useHoverSound();

  // Get wizard-specific XP from store
  const userData = useUserDataStore((state) => state.userData);

  const [currentWizard, setCurrentWizard] = useState<Wizards>(Wizards.MAGE);
  const [draggedItem, setDraggedItem] = useState<IUserInventoryItem | null>(
    null
  );
  const [activeFilter, setActiveFilter] = useState<InventoryFilterType>('all');

  // Get inventory data from store
  const iteminventory = useInventoryStore((state) => state.iteminventory);
  const equippedItemsByWizard = useInventoryStore(
    (state) => state.equippedItemsByWizard
  );
  const statsByWizard = useInventoryStore((state) => state.statsByWizard);
  const getStats = useInventoryStore((state) => state.getStats);
  const equipItem = useInventoryStore((state) => state.equipItem);
  const unequipItem = useInventoryStore((state) => state.unequipItem);

  // Get current wizard ID string
  const currentWizardId = useMemo(
    () => getWizardId(currentWizard),
    [currentWizard]
  );

  // Get equipped items for current wizard
  const equippedItems = useMemo((): EquippedSlots => {
    const defaultSlots: EquippedSlots = {
      Orb: null,
      Belt: null,
      Ring: null,
      Amulet: null,
      Boots: null,
      Gloves: null,
    };
    return equippedItemsByWizard[currentWizardId] ?? defaultSlots;
  }, [equippedItemsByWizard, currentWizardId]);

  // Get stats for current wizard from store
  const stats = useMemo(() => {
    return getStats(currentWizardId);
  }, [getStats, currentWizardId, statsByWizard]);

  // Get XP for the currently selected wizard
  const xp = useMemo(() => {
    switch (currentWizard) {
      case Wizards.ARCHER:
        return userData?.archer_xp ?? 0;
      case Wizards.WARRIOR:
        return userData?.duelist_xp ?? 0;
      case Wizards.MAGE:
        return userData?.mage_xp ?? 0;
    }
  }, [currentWizard, userData]);

  const handleNext = () => {
    setCurrentWizard((prev) => (prev + 1) % 3);
  };

  const handlePrev = () => {
    setCurrentWizard((prev) => (prev - 1 + 3) % 3);
  };

  const getWizardImage = (wizard: Wizards) => {
    switch (wizard) {
      case Wizards.MAGE:
        return '/inventory/carousel/mage.png';
      case Wizards.ARCHER:
        return '/inventory/carousel/archer.png';
      case Wizards.WARRIOR:
        return '/inventory/carousel/warrior.png';
    }
  };

  const getPrevWizard = (current: Wizards): Wizards => {
    return (current - 1 + 3) % 3;
  };

  const getNextWizard = (current: Wizards): Wizards => {
    return (current + 1) % 3;
  };

  const formatStat = (stat: IHeroStatConfig): string => {
    switch (stat.id) {
      case 'hp':
        return stats.hp.toString();
      case 'atk':
        return `+${stats.atk.toString()}%`;
      case 'accuracy':
        return `+${stats.accuracy.toString()}%`;
    }
    return `${stats[stat.id as keyof IHeroStats].toString()}%`;
  };

  const getLevelProgress = (xp: number): number => {
    // Find the current level's XP requirements
    let xpAtCurrentLevel = 0;
    let xpAtNextLevel = LEVELS_XP[0]!;

    for (let i = 0; i < LEVELS_XP.length; i++) {
      if (xp < LEVELS_XP[i]!) {
        xpAtCurrentLevel = i > 0 ? LEVELS_XP[i - 1]! : 0;
        xpAtNextLevel = LEVELS_XP[i]!;
        break;
      }
      // If we've reached the last level
      if (i === LEVELS_XP.length - 1) {
        xpAtCurrentLevel = LEVELS_XP[i]!;
        xpAtNextLevel = LEVELS_XP[i]!;
        break;
      }
    }

    const xpInCurrentLevel = xp - xpAtCurrentLevel;
    const xpNeededForNextLevel = xpAtNextLevel - xpAtCurrentLevel;

    if (xpNeededForNextLevel <= 0) return 100;

    const progress = (xpInCurrentLevel / xpNeededForNextLevel) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const handleDragStart = (userItem: IUserInventoryItem) => {
    setDraggedItem(userItem);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (slotId: InventoryItemWearableArmorSlot) => {
    if (!draggedItem) return;

    // Check if dragged item can be equipped in this slot
    if (draggedItem.item.type !== 'armor') {
      setDraggedItem(null);
      return;
    }

    const wearableItem = draggedItem.item as IInventoryArmorItem;
    if (wearableItem.wearableSlot !== slotId) {
      setDraggedItem(null);
      return;
    }

    // Use store action to equip item (handles inventory swap automatically)
    equipItem(currentWizardId, slotId, draggedItem);
    
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUnequip = (slotId: InventoryItemWearableArmorSlot) => {
    const userItem = equippedItems[slotId];
    if (!userItem) return;

    // Use store action to unequip item
    unequipItem(currentWizardId, slotId);
  };

  const filteredItems =
    activeFilter === 'all'
      ? iteminventory
      : iteminventory.filter((userItem) => userItem.item.type === activeFilter);

  const handleChangeFilter = (filterMode: InventoryFilterType) => {
    setActiveFilter(filterMode);
  };

  const filterBtns: IInventoryFilterBtnProps[] = [
    {
      isActiveFilter: activeFilter === 'all',
      title: 'All',
      handleChangeFilter: () => handleChangeFilter('all'),
    },
    {
      isActiveFilter: activeFilter === 'armor',
      title: 'Armor',
      imgSrc: '/icons/armor.png',
      alt: 'armor',
      handleChangeFilter: () => handleChangeFilter('armor'),
    },
    {
      isActiveFilter: activeFilter === 'craft',
      title: 'Craft',
      imgSrc: '/icons/pickaxe.png',
      alt: 'pickaxe',
      handleChangeFilter: () => handleChangeFilter('craft'),
    },
    {
      isActiveFilter: activeFilter === 'gems',
      title: 'Gems',
      imgSrc: '/icons/gem.png',
      alt: 'gem',
      handleChangeFilter: () => handleChangeFilter('gems'),
    },
  ];

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-50 flex size-full items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-row items-end gap-5"
      >
        {/* Left side */}
        <div className="h-210 flex flex-col justify-end gap-5">
          {/* Carousel */}
          <div className="relative flex w-full flex-row items-center justify-center gap-5">
            <button
              onClick={handlePrev}
              className="h-12 w-16 cursor-pointer transition-transform duration-300 hover:scale-110"
            >
              <Image
                src="/inventory/arrow-left.png"
                width={36}
                height={48}
                alt="left-arrow"
                className="size-full object-contain object-center"
              />
            </button>
            <div className="flex items-center justify-center gap-2">
              {/* Prev wizard (left) */}
              <div
                onClick={handlePrev}
                className="size-25 mt-auto flex-shrink-0 cursor-pointer select-none"
              >
                <Image
                  src={getWizardImage(getPrevWizard(currentWizard))}
                  width={100}
                  height={100}
                  alt="left-wizard"
                  style={{ objectFit: 'contain', pointerEvents: 'none' }}
                  draggable={false}
                  className="size-full"
                  quality={100}
                  unoptimized={true}
                />
              </div>
              {/* Center/current wizard */}
              <div className="size-35 flex-shrink-0">
                <Image
                  src={getWizardImage(currentWizard)}
                  width={120}
                  height={120}
                  alt="center-wizard"
                  style={{ objectFit: 'contain', pointerEvents: 'none' }}
                  draggable={false}
                  className="size-full"
                  quality={100}
                  unoptimized={true}
                />
              </div>
              {/* Next wizard (right) */}
              <div
                onClick={handleNext}
                className="size-25 mt-auto flex-shrink-0 cursor-pointer select-none"
              >
                <Image
                  src={getWizardImage(getNextWizard(currentWizard))}
                  width={100}
                  height={100}
                  alt="right-wizard"
                  style={{ objectFit: 'contain', pointerEvents: 'none' }}
                  draggable={false}
                  className="size-full"
                  quality={100}
                  unoptimized={true}
                />
              </div>
            </div>
            <button
              onClick={handleNext}
              className="h-12 w-16 cursor-pointer transition-transform duration-300 hover:scale-110"
            >
              <Image
                src="/inventory/arrow-right.png"
                width={36}
                height={48}
                alt="right-arrow"
                className="size-full object-contain object-center"
              />
            </button>
          </div>
          <div className="w-144 relative flex h-auto flex-col gap-5 px-5 pt-5">
            {/* Title */}
            <div className="relative mx-auto flex size-full items-center justify-center">
              <Image
                src={`/inventory/${currentWizard === Wizards.ARCHER ? 'green-title-bg.png' : currentWizard === Wizards.WARRIOR ? 'red-title-bg.png' : 'violet-title-bg.png'}`}
                width={425}
                height={70}
                alt="title-bg"
                className="w-106 h-17.5 object-contain object-center"
              />
              <div className="text-main-gray font-pixel absolute inset-0 pl-0.5 pt-3.5 text-center text-xl font-bold">
                {currentWizard === Wizards.ARCHER
                  ? 'Shadow Archer'
                  : currentWizard === Wizards.WARRIOR
                    ? 'Phantom Duelist'
                    : 'Arcane Sorcerer'}
              </div>
            </div>
            <div className="mt-9 flex size-full flex-row gap-5">
              <div className="flex h-full w-1/4 flex-col gap-5">
                <div
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200`}
                  onDrop={() => handleDrop('Orb')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('Orb')}
                >
                  {equippedItems.Orb ? (
                    <InventoryTooltip userItem={equippedItems.Orb}>
                      <Image
                        src={`/items/${equippedItems.Orb.item.image}`}
                        width={100}
                        height={100}
                        alt={equippedItems.Orb.item.title}
                        className="pointer-events-none size-full select-none object-contain object-center"
                        quality={100}
                        unoptimized={true}
                      />
                    </InventoryTooltip>
                  ) : (
                    <Image
                      src="/inventory/placeholders/orb.png"
                      width={100}
                      height={100}
                      alt="orb-placeholder"
                      className="pointer-events-none size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
                <div
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200`}
                  onDrop={() => handleDrop('Ring')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('Ring')}
                >
                  {equippedItems.Ring ? (
                    <InventoryTooltip userItem={equippedItems.Ring}>
                      <Image
                        src={`/items/${equippedItems.Ring.item.image}`}
                        width={100}
                        height={100}
                        alt={equippedItems.Ring.item.title}
                        className="pointer-events-none size-full select-none object-contain object-center"
                        quality={100}
                        unoptimized={true}
                      />
                    </InventoryTooltip>
                  ) : (
                    <Image
                      src="/inventory/placeholders/ring.png"
                      width={100}
                      height={100}
                      alt="ring-placeholder"
                      className="pointer-events-none size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
                <div
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200`}
                  onDrop={() => handleDrop('Amulet')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('Amulet')}
                >
                  {equippedItems.Amulet ? (
                    <InventoryTooltip userItem={equippedItems.Amulet}>
                      <Image
                        src={`/items/${equippedItems.Amulet.item.image}`}
                        width={100}
                        height={100}
                        alt={equippedItems.Amulet.item.title}
                        className="pointer-events-none size-full select-none object-contain object-center"
                        quality={100}
                        unoptimized={true}
                      />
                    </InventoryTooltip>
                  ) : (
                    <Image
                      src="/inventory/placeholders/amulet.png"
                      width={100}
                      height={100}
                      alt="amulet-placeholder"
                      className="pointer-events-none size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
              </div>
              <div className="relative size-[95%]">
                <Image
                  src={`/inventory/wall/${currentWizard === Wizards.ARCHER ? 'archer.png' : currentWizard === Wizards.WARRIOR ? 'warrior.png' : 'mage.png'}`}
                  width={1000}
                  height={1000}
                  quality={100}
                  unoptimized={true}
                  alt="wall"
                  className="size-full object-contain object-center"
                />

                {/* Level bar */}
                <div className="w-38 -z-1 absolute -top-5 left-1/2 h-6 -translate-x-1/2 overflow-hidden">
                  <LvlBg className="-z-1 absolute inset-0 size-full" />
                  <div className="-z-3 absolute inset-0 ml-1 mt-1 h-[80%] w-full bg-[#D5D8DD]" />
                  <div
                    className="-z-2 absolute inset-0 ml-1 mt-1 h-[80%] bg-[#006D00]"
                    style={{
                      width: `${getLevelProgress(xp)}%`,
                    }}
                  />
                  <div className="font-pixel absolute left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2 text-[0.417vw] font-bold text-white">
                    Lvl. {levelFromXp(xp)}
                  </div>
                </div>
              </div>
              <div className="flex h-full w-1/4 flex-col gap-5">
                <div
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200`}
                  onDrop={() => handleDrop('Gloves')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('Gloves')}
                >
                  {equippedItems.Gloves ? (
                    <InventoryTooltip userItem={equippedItems.Gloves}>
                      <Image
                        src={`/items/${equippedItems.Gloves.item.image}`}
                        width={100}
                        height={100}
                        alt={equippedItems.Gloves.item.title}
                        className="pointer-events-none size-full select-none object-contain object-center"
                        quality={100}
                        unoptimized={true}
                      />
                    </InventoryTooltip>
                  ) : (
                    <Image
                      src="/inventory/placeholders/gloves.png"
                      width={100}
                      height={100}
                      alt="gloves-placeholder"
                      className="pointer-events-none size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
                <div
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200`}
                  onDrop={() => handleDrop('Boots')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('Boots')}
                >
                  {equippedItems.Boots ? (
                    <InventoryTooltip userItem={equippedItems.Boots}>
                      <Image
                        src={`/items/${equippedItems.Boots.item.image}`}
                        width={100}
                        height={100}
                        alt={equippedItems.Boots.item.title}
                        className="pointer-events-none size-full select-none object-contain object-center"
                        quality={100}
                        unoptimized={true}
                      />
                    </InventoryTooltip>
                  ) : (
                    <Image
                      src="/inventory/placeholders/boots.png"
                      width={100}
                      height={100}
                      alt="boots-placeholder"
                      className="pointer-events-none size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
                <div
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200`}
                  onDrop={() => handleDrop('Belt')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('Belt')}
                >
                  {equippedItems.Belt ? (
                    <InventoryTooltip userItem={equippedItems.Belt}>
                      <Image
                        src={`/items/${equippedItems.Belt.item.image}`}
                        width={100}
                        height={100}
                        alt={equippedItems.Belt.item.title}
                        className="pointer-events-none size-full select-none object-contain object-center"
                        quality={100}
                        unoptimized={true}
                      />
                    </InventoryTooltip>
                  ) : (
                    <Image
                      src="/inventory/placeholders/belt.png"
                      width={100}
                      height={100}
                      alt="belt-placeholder"
                      className="pointer-events-none size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 items-center gap-x-10 gap-y-2.5">
              {heroStatsConfig.map((stat) => {
                return (
                  <div
                    key={stat.id}
                    className="flex flex-row items-center gap-2"
                  >
                    <Image
                      src={stat.icon}
                      width={100}
                      height={100}
                      alt={stat.alt}
                      className="size-8 object-contain object-center"
                    />
                    <span className="font-pixel text-nowrap text-lg font-bold text-[#747C8F]">
                      {stat.label}:{' '}
                      <b className="text-main-gray">{formatStat(stat)}</b>
                    </span>
                  </div>
                );
              })}
            </div>
            <CharacterBg className="-z-5 absolute inset-0 h-auto w-full" />
          </div>
        </div>
        {/* Right side */}
        <div className="w-218 h-189 relative -mb-2.5 px-5 pt-5">
          <div className="font-pixel text-main-gray w-full pb-5 pt-2.5 text-center text-3xl font-bold">
            Inventory
          </div>
          {/* Items */}
          <div className="grid grid-cols-7 gap-2.5">
            <div className="col-span-7 mb-2.5 grid grid-cols-8 gap-2.5">
              {filterBtns.map((btnProps, index) => (
                <InventoryFilterBtn
                  key={`${btnProps.title}-${index}`}
                  {...btnProps}
                />
              ))}
            </div>
            {filteredItems.map((userItem) => (
              <div
                key={userItem.item.id}
                className="size-25 relative cursor-grab p-6 active:cursor-grabbing"
                draggable
                onDragStart={() => handleDragStart(userItem)}
                onDragEnd={handleDragEnd}
              >
                <InventoryTooltip userItem={userItem}>
                  <Image
                    src={`/items/${userItem.item.image}`}
                    width={100}
                    height={100}
                    alt={userItem.item.title}
                    quality={100}
                    unoptimized={true}
                    className="size-full object-contain object-center"
                  />
                </InventoryTooltip>
                <div className="font-pixel text-main-gray absolute bottom-2 right-2 text-sm font-bold">
                  {userItem.quantity}
                </div>
                <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
              </div>
            ))}
            {Array.from({ length: MAX_ITEMS - filteredItems.length }).map(
              (_, index) => (
                <div key={index} className="size-25 relative p-6">
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
              )
            )}
          </div>
          <Image
            src="/icons/cross.png"
            width={32}
            height={32}
            alt="close"
            className="absolute right-5 top-5 size-8 cursor-pointer transition-transform duration-300 hover:rotate-90"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            onMouseEnter={playHoverSound}
          />
          <InventoryBg className="-z-5 absolute inset-0 size-full" />
        </div>
      </div>
    </div>
  );
}
