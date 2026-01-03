'use client';

import Image from 'next/image';
import type {
  IInventoryItem,
  InventoryFilterType,
} from '@/lib/types/Inventory';
import { ALL_ITEMS } from '@/lib/constants/items';
import { useState } from 'react';
import { InventoryTooltip } from '../InventoryModal/InventoryTooltip';
import type { IInventoryFilterBtnProps } from '../InventoryModal/InventoryFilterBtn';
import InventoryFilterBtn from '../InventoryModal/InventoryFilterBtn';
import { ItemBg } from '../InventoryModal/assets/item-bg';
import { InventoryBg } from './assets/inventory-bg';

const MAX_ITEMS = 35;

export function InventoryModalForm({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<IInventoryItem[]>([...ALL_ITEMS]);
  const [draggedItem, setDraggedItem] = useState<IInventoryItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<InventoryFilterType>('all');

  const handleDragStart = (item: IInventoryItem) => {
    setDraggedItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const filteredItems =
    activeFilter === 'all'
      ? items
      : items.filter((item) => item.type === activeFilter);

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
    <div className="w-261 h-220 relative px-5 pt-5">
      <div className="font-pixel text-main-gray flex w-full items-center justify-between pb-5 pt-2.5 text-3xl font-bold">
        <span className="flex-1 text-center">Inventory</span>
        <Image
          src="/icons/cross.png"
          width={32}
          height={32}
          alt="close"
          className="mr-4 size-8 cursor-pointer transition-transform duration-300 hover:rotate-90"
          onClick={onClose}
        />
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
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="size-25 relative cursor-grab p-6 active:cursor-grabbing"
            draggable
            onDragStart={() => handleDragStart(item)}
            onDragEnd={handleDragEnd}
          >
            <InventoryTooltip item={item}>
              <Image
                src={`/items/${item.image}`}
                width={100}
                height={100}
                alt={item.title}
                quality={100}
                unoptimized={true}
                className="size-full object-contain object-center"
              />
            </InventoryTooltip>
            <div className="font-pixel text-main-gray absolute bottom-2 right-2 text-sm font-bold">
              {item.amount}
            </div>
            <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
          </div>
        ))}
        {Array.from({ length: MAX_ITEMS - items.length }).map((_, index) => (
          <div key={index} className="size-25 relative p-6">
            <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
          </div>
        ))}
      </div>
      <InventoryBg className="-z-5 absolute inset-0 size-full" />
    </div>
  );
}
