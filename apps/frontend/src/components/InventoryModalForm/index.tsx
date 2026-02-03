'use client';

import Image from 'next/image';
import type {
  InventoryFilterType,
  IUserInventoryItem,
} from '@/lib/types/Inventory';
import { useState, useCallback, useMemo, memo } from 'react';
import { InventoryTooltip } from '../InventoryModal/InventoryTooltip';
import type { IInventoryFilterBtnProps } from '../InventoryModal/InventoryFilterBtn';
import InventoryFilterBtn from '../InventoryModal/InventoryFilterBtn';
import { ItemBg } from '../InventoryModal/assets/item-bg';
import { InventoryModalFormBg } from './assets/inventory-bg';
import { Button } from '../shared/Button';
import { useInventoryStore } from '@/lib/store';

const ITEMS_PER_PAGE = 28; // 7 columns × 4 rows
const ROWS = 4;
const COLS = 7;

// Mock for pagination (temporary for styling)
const MOCK_PAGINATION = true;
const MOCK_TOTAL_PAGES = 2;

// Memoized component for inventory item
const InventoryItem = memo(
  ({
    userItem,
    isDragged,
    onDragStart,
    onDragEnd,
  }: {
    userItem: IUserInventoryItem;
    isDragged: boolean;
    onDragStart: (userItem: IUserInventoryItem, e: React.DragEvent) => void;
    onDragEnd: () => void;
  }) => (
    <div
      key={userItem.item.id}
      className={`size-25 relative p-6 transition-opacity duration-200 ${
        isDragged ? 'cursor-grabbing opacity-50' : 'cursor-grab opacity-100'
      }`}
      draggable
      onDragStart={(e) => onDragStart(userItem, e)}
      onDragEnd={onDragEnd}
      data-item-id={userItem.item.id}
      data-item-type={userItem.item.type}
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
  )
);

InventoryItem.displayName = 'InventoryItem';

export interface IInventoryModalFormProps {
  onClose: () => void;
  /**
   * Callback called when item drag starts
   */
  onItemDragStart?: (userItem: IUserInventoryItem) => void;
  /**
   * Callback called when item drag ends
   */
  onItemDragEnd?: (userItem: IUserInventoryItem | null) => void;
  /**
   * Callback called when item is removed from inventory
   */
  onItemRemove?: (userItem: IUserInventoryItem) => void;
  /**
   * External control of dragged item (optional)
   */
  draggedItem?: IUserInventoryItem | null;
}

export function InventoryModalForm({
  onClose,
  onItemDragStart,
  onItemDragEnd,
  onItemRemove,
  draggedItem: externalDraggedItem,
}: IInventoryModalFormProps) {
  // Get items from store
  const inventoryItems = useInventoryStore((state) => state.inventoryItems);
  const removeFromInventory = useInventoryStore(
    (state) => state.removeFromInventory
  );

  const [internalDraggedItem, setInternalDraggedItem] =
    useState<IUserInventoryItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<InventoryFilterType>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Use external state if provided, otherwise use internal
  const draggedItem =
    externalDraggedItem !== undefined
      ? externalDraggedItem
      : internalDraggedItem;

  const handleDragStart = useCallback(
    (userItem: IUserInventoryItem) => {
      if (externalDraggedItem === undefined) {
        setInternalDraggedItem(userItem);
      }
      onItemDragStart?.(userItem);
    },
    [externalDraggedItem, onItemDragStart]
  );

  const handleDragEnd = useCallback(() => {
    const previousDraggedItem = draggedItem;
    if (externalDraggedItem === undefined) {
      setInternalDraggedItem(null);
    }
    onItemDragEnd?.(previousDraggedItem);
  }, [draggedItem, externalDraggedItem, onItemDragEnd]);

  const filteredItems = useMemo(() => {
    return activeFilter === 'all'
      ? inventoryItems
      : inventoryItems.filter(
          (userItem) => userItem.item.type === activeFilter
        );
  }, [inventoryItems, activeFilter]);

  const totalPages = useMemo(() => {
    return MOCK_PAGINATION
      ? MOCK_TOTAL_PAGES
      : Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  }, [filteredItems.length]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage]);

  const handleChangeFilter = useCallback((filterMode: InventoryFilterType) => {
    setActiveFilter(filterMode);
    setCurrentPage(1); // Reset to first page when filter changes
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  }, [totalPages]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  }, []);

  const handleDeleteItem = useCallback(
    (userItem: IUserInventoryItem) => {
      // Remove item from store
      removeFromInventory(userItem.item.id);
      // Notify parent component
      onItemRemove?.(userItem);
    },
    [removeFromInventory, onItemRemove]
  );

  const handleItemDragStart = useCallback(
    (userItem: IUserInventoryItem, e: React.DragEvent) => {
      handleDragStart(userItem);
      // Add data for transfer between components
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify(userItem));
      e.dataTransfer.setData('text/plain', userItem.item.id);
    },
    [handleDragStart]
  );

  const filterBtns: IInventoryFilterBtnProps[] = useMemo(
    () => [
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
    ],
    [activeFilter, handleChangeFilter]
  );

  return (
    <div className="w-230 h-199 relative px-5 pt-5">
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
      <div className="px-13">
        <div className="mb-2.5 mt-5 flex flex-row gap-2.5">
          {filterBtns.map((btnProps, index) => (
            <InventoryFilterBtn
              key={`${btnProps.title}-${index}`}
              {...btnProps}
            />
          ))}
        </div>

        <div className="mt-10 grid grid-cols-7 gap-2.5">
          {paginatedItems.map((userItem) => (
            <InventoryItem
              key={userItem.item.id}
              userItem={userItem}
              isDragged={draggedItem?.item.id === userItem.item.id}
              onDragStart={handleItemDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
          {Array.from({
            length: ITEMS_PER_PAGE - paginatedItems.length,
          }).map((_, index) => (
            <div key={`empty-${index}`} className="size-25 relative p-6">
              <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
            </div>
          ))}
        </div>

        {/* Pagination */}
        {(MOCK_PAGINATION || totalPages > 1) && (
          <div className="relative mt-5 flex w-full items-center">
            {/* Action button - left side */}
            <div className="flex-1">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedItem) {
                    handleDeleteItem(draggedItem);
                  }
                }}
              >
                <Button
                  variant={'gray'}
                  className={`flex h-16 w-auto flex-row items-center gap-2.5 px-6 transition-all duration-200 ${
                    draggedItem ? 'ring-2 ring-red-500 ring-opacity-50' : ''
                  }`}
                >
                  <Image
                    src={'/icons/trash.png'}
                    width={32}
                    height={28}
                    alt={'delete'}
                    className="h-7 w-8 object-contain object-center"
                  />
                  <span className="font-pixel text-main-gray text-lg font-bold">
                    Delete
                  </span>
                </Button>
              </div>
            </div>

            {/* Pagination controls - centered */}
            <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-5">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="transition-transform duration-300 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Image
                  src="/inventory/arrow-left.png"
                  width={36}
                  height={48}
                  alt="previous-page"
                  className="h-12 w-16 object-contain object-center"
                />
              </button>
              <div className="font-pixel text-main-gray text-xl font-bold">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="transition-transform duration-300 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Image
                  src="/inventory/arrow-right.png"
                  width={36}
                  height={48}
                  alt="next-page"
                  className="h-12 w-16 object-contain object-center"
                />
              </button>
            </div>

            {/* Empty space on the right for balance */}
            <div className="flex-1"></div>
          </div>
        )}
      </div>

      <InventoryModalFormBg className="-z-5 absolute inset-0 size-full" />
    </div>
  );
}
