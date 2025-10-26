'use client';

import { Button } from '../shared/Button';
import { InventoryBg } from './assets/inventory-bg';
import Image from 'next/image';
import type { IInventoryArmor, IInventoryItem } from '@/lib/types/Inventory';
import { ItemBg } from './assets/item-bg';
import { ALL_ITEMS } from '@/lib/constants/items';
import { useState } from 'react';
import { CharacterBg } from './assets/character-bg';
import { LvlBg } from './assets/lvl-bg';
import { LEVELS_XP, levelFromXp } from '@/lib/constants/levels';
import { SmBtn } from './assets/sm-btn';

const MAX_ITEMS = 35;

interface StatConfig {
  id: string;
  icon: string;
  label: string;
  alt: string;
}

const defaultStats = {
  hp: 100,
  atk: 10,
  def: 10,
  crit: 10,
  dodge: 10,
  accuracy: 10,
};

const statsConfig: StatConfig[] = [
  {
    id: 'hp',
    icon: '/inventory/stats/hp.png',
    label: 'Hp',
    alt: 'hp',
  },
  {
    id: 'atk',
    icon: '/inventory/stats/attack.png',
    label: 'Atk',
    alt: 'attack',
  },
  {
    id: 'def',
    icon: '/inventory/stats/defence.png',
    label: 'Def',
    alt: 'defence',
  },
  {
    id: 'crit',
    icon: '/inventory/stats/crit.png',
    label: 'Crit',
    alt: 'crit',
  },
  {
    id: 'dodge',
    icon: '/inventory/stats/dodge.png',
    label: 'Dodge',
    alt: 'dodge',
  },
  {
    id: 'accuracy',
    icon: '/inventory/stats/accuracy.png',
    label: 'Acc',
    alt: 'accuracy',
  },
];

enum Wizards {
  ARCHER,
  WARRIOR,
  MAGE,
}

export default function InventoryModal({ onClose }: { onClose: () => void }) {
  const xp = 17;

  const [items, setItems] = useState<IInventoryItem[] | IInventoryArmor[]>(
    ALL_ITEMS
  );
  const [currentWizard, setCurrentWizard] = useState<Wizards>(Wizards.MAGE);
  const [stats, setStats] = useState<typeof defaultStats>(defaultStats);
  const [equippedItems, setEquippedItems] = useState<
    Record<string, IInventoryItem | null>
  >({
    gem: null,
    ring: null,
    necklace: null,
    arms: null,
    legs: null,
    belt: null,
  });
  const [draggedItem, setDraggedItem] = useState<IInventoryItem | null>(null);

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

  const formatStat = (stat: StatConfig): string => {
    switch (stat.id) {
      case 'hp':
        return stats.hp.toString();
      case 'atk':
        return `+${stats.atk.toString()}%`;
      case 'accuracy':
        return `+${stats.accuracy.toString()}%`;
    }
    return `${stats[stat.id as keyof typeof defaultStats].toString()}%`;
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

  const handleDragStart = (item: IInventoryItem) => {
    setDraggedItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (slotId: string) => {
    if (!draggedItem) return;

    // Get current item in slot
    const currentEquippedItem = equippedItems[slotId];

    // Update equipped items
    setEquippedItems((prev) => {
      const newEquipped = { ...prev };

      // Check if item is already equipped in another slot
      Object.keys(newEquipped).forEach((key) => {
        if (newEquipped[key]?.id === draggedItem.id) {
          newEquipped[key] = null;
        }
      });

      newEquipped[slotId] = draggedItem;

      return newEquipped;
    });

    // Remove item from inventory
    setItems((prev) => prev.filter((item) => item.id !== draggedItem.id));

    // If there was an item in the slot, return it to the inventory
    if (currentEquippedItem) {
      setItems((prev) => [...prev, currentEquippedItem]);
    }

    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUnequip = (slotId: string) => {
    const item = equippedItems[slotId];
    if (!item) return;

    // Return item to inventory
    setItems((prev) => [...prev, item]);

    // Remove item from slot
    setEquippedItems((prev) => ({
      ...prev,
      [slotId]: null,
    }));
  };

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
                  onDrop={() => handleDrop('gem')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('gem')}
                >
                  {equippedItems.gem ? (
                    <Image
                      src={`/items/${equippedItems.gem.image}`}
                      width={100}
                      height={100}
                      alt={equippedItems.gem.title}
                      className="size-full object-contain object-center"
                      quality={100}
                      unoptimized={true}
                    />
                  ) : (
                    <Image
                      src="/inventory/placeholders/gem.png"
                      width={100}
                      height={100}
                      alt="gem-placeholder"
                      className="size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
                <div
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200`}
                  onDrop={() => handleDrop('ring')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('ring')}
                >
                  {equippedItems.ring ? (
                    <Image
                      src={`/items/${equippedItems.ring.image}`}
                      width={100}
                      height={100}
                      alt={equippedItems.ring.title}
                      className="size-full select-none object-contain object-center"
                      quality={100}
                      unoptimized={true}
                    />
                  ) : (
                    <Image
                      src="/inventory/placeholders/ring.png"
                      width={100}
                      height={100}
                      alt="ring-placeholder"
                      className="size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
                <div
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200`}
                  onDrop={() => handleDrop('necklace')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('necklace')}
                >
                  {equippedItems.necklace ? (
                    <Image
                      src={`/items/${equippedItems.necklace.image}`}
                      width={100}
                      height={100}
                      alt={equippedItems.necklace.title}
                      className="size-full select-none object-contain object-center"
                      quality={100}
                      unoptimized={true}
                    />
                  ) : (
                    <Image
                      src="/inventory/placeholders/necklace.png"
                      width={100}
                      height={100}
                      alt="necklace-placeholder"
                      className="size-full select-none object-contain object-center"
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
                  onDrop={() => handleDrop('arms')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('arms')}
                >
                  {equippedItems.arms ? (
                    <Image
                      src={`/items/${equippedItems.arms.image}`}
                      width={100}
                      height={100}
                      alt={equippedItems.arms.title}
                      className="size-full select-none object-contain object-center"
                      quality={100}
                      unoptimized={true}
                    />
                  ) : (
                    <Image
                      src="/inventory/placeholders/arms.png"
                      width={100}
                      height={100}
                      alt="arms-placeholder"
                      className="size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
                <div
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200`}
                  onDrop={() => handleDrop('legs')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('legs')}
                >
                  {equippedItems.legs ? (
                    <Image
                      src={`/items/${equippedItems.legs.image}`}
                      width={100}
                      height={100}
                      alt={equippedItems.legs.title}
                      className="pointer-events-none size-full select-none object-contain object-center"
                      quality={100}
                      unoptimized={true}
                    />
                  ) : (
                    <Image
                      src="/inventory/placeholders/legs.png"
                      width={100}
                      height={100}
                      alt="legs-placeholder"
                      className="pointer-events-none size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
                <div
                  className={`size-25 relative cursor-pointer p-6 transition-all duration-200`}
                  onDrop={() => handleDrop('belt')}
                  onDragOver={handleDragOver}
                  onClick={() => handleUnequip('belt')}
                >
                  {equippedItems.belt ? (
                    <Image
                      src={`/items/${equippedItems.belt.image}`}
                      width={100}
                      height={100}
                      alt={equippedItems.belt.title}
                      className="size-full select-none object-contain object-center"
                      quality={100}
                      unoptimized={true}
                    />
                  ) : (
                    <Image
                      src="/inventory/placeholders/belt.png"
                      width={100}
                      height={100}
                      alt="belt-placeholder"
                      className="size-full select-none object-contain object-center"
                    />
                  )}
                  <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-3 items-center gap-x-10 gap-y-2.5">
              {statsConfig.map((stat) => {
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
            <button className="w-25 relative h-16 cursor-pointer transition-transform duration-300 hover:scale-105">
              <SmBtn className="-z-1 absolute inset-0 size-full" />
              <span className="font-pixel text-main-gray text-lg font-bold">
                All
              </span>
            </button>
            <Button
              variant="gray"
              className="col-span-2 flex size-full flex-row items-center gap-2.5"
            >
              <Image
                src="/icons/armor.png"
                width={32}
                height={28}
                alt="armor"
                className="h-7 w-8 object-contain object-center"
              />
              <span className="font-pixel text-main-gray text-lg font-bold">
                Armor
              </span>
            </Button>
            <Button
              variant="gray"
              className="col-span-2 flex size-full flex-row items-center gap-2.5"
            >
              <Image
                src="/icons/pickaxe.png"
                width={32}
                height={28}
                alt="pickaxe"
                className="h-7 w-8 object-contain object-center"
              />
              <span className="font-pixel text-main-gray text-lg font-bold">
                Craft
              </span>
            </Button>
            <Button
              variant="gray"
              className="col-span-2 flex size-full flex-row items-center gap-2.5"
            >
              <Image
                src="/icons/gem.png"
                width={32}
                height={28}
                alt="gem"
                className="h-7 w-8 object-contain object-center"
              />
              <span className="font-pixel text-main-gray text-lg font-bold">
                Gems
              </span>
            </Button>
            {items.map((item) => (
              <div
                key={item.id}
                className="size-25 relative cursor-grab p-6 active:cursor-grabbing"
                draggable
                onDragStart={() => handleDragStart(item)}
                onDragEnd={handleDragEnd}
              >
                <Image
                  src={`/items/${item.image}`}
                  width={100}
                  height={100}
                  alt={item.title}
                  quality={100}
                  unoptimized={true}
                  className="size-full object-contain object-center"
                />
                <div className="font-pixel text-main-gray absolute bottom-2 right-2 text-sm font-bold">
                  {item.amount}
                </div>
                <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
              </div>
            ))}
            {Array.from({ length: MAX_ITEMS - items.length }).map(
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
            onClick={onClose}
          />
          <InventoryBg className="-z-5 absolute inset-0 size-full" />
        </div>
      </div>
    </div>
  );
}
