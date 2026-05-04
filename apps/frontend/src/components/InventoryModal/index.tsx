'use client';

import Image from 'next/image';
import type {
  IInventoryArmorItem,
  InventoryItemWearableArmorSlot,
  IUserInventoryItem,
  WizardClassName,
} from '@/lib/types/Inventory';
import { ItemBg } from './assets/item-bg';
import { useState, useMemo } from 'react';
import { AnimatedHero } from '@/components/AnimatedHero';
import { CharacterBg } from './assets/character-bg';
import { LvlBg } from './assets/lvl-bg';
import { LEVELS_XP, levelFromXp } from '@/lib/constants/levels';
import { InventoryTooltip } from './InventoryTooltip';
import { heroStatsConfig } from '@/lib/constants/stat';
import type { IHeroStatConfig, IHeroStats } from '@/lib/types/IHeroStat';
import {
  useInventoryStore,
  useUserDataStore,
  type EquippedSlots,
} from '@/lib/store';
import { WizardId } from '../../../../common/wizards';
import { useModalSound, useClickSound } from '@/lib/hooks/useAudio';
import { useMinaAppkit } from 'mina-appkit';
import { InventoryModalForm } from '@/components/InventoryModalForm';

enum Wizards {
  ARCHER,
  WARRIOR,
  MAGE,
}

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

const getWizardClassName = (wizard: Wizards): WizardClassName => {
  switch (wizard) {
    case Wizards.ARCHER:
      return 'ShadowArcher';
    case Wizards.WARRIOR:
      return 'PhantomDuelist';
    case Wizards.MAGE:
      return 'ArcaneSorcerer';
  }
};

export default function InventoryModal({ onClose }: { onClose: () => void }) {
  useModalSound();
  const playClickSound = useClickSound();

  const { address } = useMinaAppkit();
  const userData = useUserDataStore((state) => state.userData);

  const [currentWizard, setCurrentWizard] = useState<Wizards>(Wizards.MAGE);
  const [draggedItem, setDraggedItem] = useState<IUserInventoryItem | null>(
    null
  );

  const equippedItemsByWizard = useInventoryStore(
    (state) => state.equippedItemsByWizard
  );
  const statsByWizard = useInventoryStore((state) => state.statsByWizard);
  const getStats = useInventoryStore((state) => state.getStats);
  const equipItem = useInventoryStore((state) => state.equipItem);
  const unequipItem = useInventoryStore((state) => state.unequipItem);

  const currentWizardId = useMemo(
    () => getWizardId(currentWizard),
    [currentWizard]
  );

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

  const stats = useMemo(() => {
    return getStats(currentWizardId);
  }, [getStats, currentWizardId, statsByWizard]);

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

  const handleNext = () => setCurrentWizard((prev) => (prev + 1) % 3);
  const handlePrev = () => setCurrentWizard((prev) => (prev - 1 + 3) % 3);

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

  const getPrevWizard = (current: Wizards): Wizards => (current - 1 + 3) % 3;
  const getNextWizard = (current: Wizards): Wizards => (current + 1) % 3;

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
    let xpAtCurrentLevel = 0;
    let xpAtNextLevel = LEVELS_XP[0]!;

    for (let i = 0; i < LEVELS_XP.length; i++) {
      if (xp < LEVELS_XP[i]!) {
        xpAtCurrentLevel = i > 0 ? LEVELS_XP[i - 1]! : 0;
        xpAtNextLevel = LEVELS_XP[i]!;
        break;
      }
      if (i === LEVELS_XP.length - 1) {
        xpAtCurrentLevel = LEVELS_XP[i]!;
        xpAtNextLevel = LEVELS_XP[i]!;
        break;
      }
    }

    const xpInCurrentLevel = xp - xpAtCurrentLevel;
    const xpNeededForNextLevel = xpAtNextLevel - xpAtCurrentLevel;
    if (xpNeededForNextLevel <= 0) return 100;
    return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (slotId: InventoryItemWearableArmorSlot) => {
    if (!draggedItem || !address) return;

    if (draggedItem.item.type !== 'armor') {
      setDraggedItem(null);
      return;
    }

    const wearableItem = draggedItem.item as IInventoryArmorItem;
    if (wearableItem.wearableSlot !== slotId) {
      setDraggedItem(null);
      return;
    }

    if (wearableItem.wearRequirements && wearableItem.wearRequirements.length > 0) {
      const currentClassName = getWizardClassName(currentWizard);
      const currentLevel = levelFromXp(xp);

      for (const req of wearableItem.wearRequirements) {
        if (req.requirement.toLowerCase() === 'class') {
          if (req.value !== currentClassName) {
            console.warn(
              `Cannot equip ${wearableItem.title}: Requires class ${req.value}, but current wizard is ${currentClassName}`
            );
            setDraggedItem(null);
            return;
          }
        }
        if (req.requirement.toLowerCase() === 'level') {
          const requiredLevel =
            typeof req.value === 'string' ? parseInt(req.value, 10) : req.value;
          if (currentLevel < requiredLevel) {
            console.warn(
              `Cannot equip ${wearableItem.title}: Requires level ${requiredLevel}, but current wizard is level ${currentLevel}`
            );
            setDraggedItem(null);
            return;
          }
        }
      }
    }

    await equipItem(address, currentWizardId, slotId, draggedItem);
    setDraggedItem(null);
  };

  const handleUnequip = async (slotId: InventoryItemWearableArmorSlot) => {
    if (!address) return;
    const userItem = equippedItems[slotId];
    if (!userItem) return;
    await unequipItem(address, currentWizardId, slotId);
  };

  const EquipSlot = ({
    slotId,
    placeholder,
  }: {
    slotId: InventoryItemWearableArmorSlot;
    placeholder: string;
  }) => {
    const item = equippedItems[slotId];
    return (
      <div
        className="size-25 relative cursor-pointer p-6 transition-all duration-200"
        onDrop={() => handleDrop(slotId)}
        onDragOver={handleDragOver}
        onClick={() => handleUnequip(slotId)}
      >
        {item ? (
          <InventoryTooltip userItem={item}>
            <div className="size-full">
              <Image
                src={`/items/${item.item.image}`}
                width={100}
                height={100}
                alt={item.item.title}
                className="pointer-events-none size-full select-none object-contain object-center"
                quality={100}
                unoptimized={true}
              />
            </div>
          </InventoryTooltip>
        ) : (
          <Image
            src={`/inventory/placeholders/${placeholder}.png`}
            width={100}
            height={100}
            alt={`${placeholder}-placeholder`}
            className="pointer-events-none size-full select-none object-contain object-center"
          />
        )}
        <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
      </div>
    );
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
        {/* Left side: wizard carousel + equipment slots + stats */}
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
            {/* Wizard title */}
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

            {/* Equipment slots + animated hero */}
            <div className="mt-9 flex size-full flex-row gap-5">
              <div className="flex h-full w-1/4 flex-col gap-5">
                <EquipSlot slotId="Orb" placeholder="orb" />
                <EquipSlot slotId="Ring" placeholder="ring" />
                <EquipSlot slotId="Amulet" placeholder="amulet" />
              </div>

              <div className="relative size-[95%]">
                <AnimatedHero wizardId={currentWizardId} className="size-full" />
                {/* Level bar */}
                <div className="w-38 -z-1 absolute -top-5 left-1/2 h-6 -translate-x-1/2 overflow-hidden">
                  <LvlBg className="-z-1 absolute inset-0 size-full" />
                  <div className="-z-3 absolute inset-0 ml-1 mt-1 h-[80%] w-full bg-[#D5D8DD]" />
                  <div
                    className="-z-2 absolute inset-0 ml-1 mt-1 h-[80%] bg-[#006D00]"
                    style={{ width: `${getLevelProgress(xp)}%` }}
                  />
                  <div className="font-pixel absolute left-1/2 top-2/3 -translate-x-1/2 -translate-y-1/2 text-[0.417vw] font-bold text-white">
                    Lvl. {levelFromXp(xp)}
                  </div>
                </div>
              </div>

              <div className="flex h-full w-1/4 flex-col gap-5">
                <EquipSlot slotId="Gloves" placeholder="gloves" />
                <EquipSlot slotId="Boots" placeholder="boots" />
                <EquipSlot slotId="Belt" placeholder="belt" />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 items-center gap-x-10 gap-y-2.5">
              {heroStatsConfig.map((stat) => (
                <div key={stat.id} className="flex flex-row items-center gap-2">
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
              ))}
            </div>

            <CharacterBg className="-z-5 absolute inset-0 h-auto w-full" />
          </div>
        </div>

        {/* Right side: inventory grid via InventoryModalForm */}
        <InventoryModalForm
          onClose={() => {
            playClickSound();
            onClose();
          }}
          address={address ?? undefined}
          onItemDragStart={(userItem) => setDraggedItem(userItem)}
          onItemDragEnd={() => setDraggedItem(null)}
          draggedItem={draggedItem}
        />
      </div>
    </div>
  );
}
