import Image from 'next/image';
import { ItemBg } from '../../InventoryModal/assets/item-bg';
import type {
  IInventoryItem,
  InventoryFilterType,
} from '@/lib/types/Inventory';
import { useState, useCallback, memo, useRef } from 'react';

interface ItemSlotProps {
  item?: IInventoryItem | null;
  placeholder?: string;
  placeholderAlt?: string;
  label?: string;
  onItemDrop?: (item: IInventoryItem) => void;
  onItemRemove?: () => void;
  onClick?: () => void;
  showAmount?: boolean;
  className?: string;
  /**
   * Accepted item types for this slot (optional)
   */
  acceptedTypes?: InventoryFilterType[];
  /**
   * Indicator that an item is currently being dragged over the slot
   */
  isDraggedOver?: boolean;
}

export const ItemSlot = memo(function ItemSlot({
  item,
  placeholder,
  placeholderAlt = 'placeholder',
  label,
  onItemDrop,
  onItemRemove,
  onClick,
  showAmount = false,
  className = '',
  acceptedTypes,
}: ItemSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragOverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDragOverRef = useRef<number>(0);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Throttle: limit update frequency to 100ms
      const now = Date.now();
      if (now - lastDragOverRef.current < 100) {
        return;
      }
      lastDragOverRef.current = now;

      // Check if we can accept this item
      const itemData = e.dataTransfer.getData('application/json');
      if (itemData) {
        try {
          const draggedItem = JSON.parse(itemData) as IInventoryItem;
          // If accepted types are specified, check compatibility
          if (acceptedTypes && acceptedTypes.length > 0) {
            if (acceptedTypes.includes(draggedItem.type)) {
              e.dataTransfer.dropEffect = 'move';
              setIsDragOver(true);
            } else {
              e.dataTransfer.dropEffect = 'none';
            }
          } else {
            e.dataTransfer.dropEffect = 'move';
            setIsDragOver(true);
          }
        } catch (error) {
          console.error('Error parsing dragged item:', error);
        }
      }
    },
    [acceptedTypes]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear timeout if exists
    if (dragOverTimeoutRef.current) {
      clearTimeout(dragOverTimeoutRef.current);
    }

    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const itemData = e.dataTransfer.getData('application/json');
      if (itemData && onItemDrop) {
        try {
          const droppedItem = JSON.parse(itemData) as IInventoryItem;

          // Check types before drop
          if (acceptedTypes && acceptedTypes.length > 0) {
            if (!acceptedTypes.includes(droppedItem.type)) {
              return; // Don't accept incompatible types
            }
          }

          onItemDrop(droppedItem);
        } catch (error) {
          console.error('Error parsing dropped item:', error);
        }
      }
    },
    [onItemDrop, acceptedTypes]
  );

  const handleClick = useCallback(() => {
    // If there's an item in the slot and a remove handler exists
    if (item && onItemRemove) {
      onItemRemove();
    } else if (onClick) {
      onClick();
    }
  }, [item, onItemRemove, onClick]);

  return (
    <div
      className={`size-25 relative cursor-pointer p-5 transition-all duration-200 ${
        isDragOver ? 'ring-2 ring-green-500 ring-opacity-70' : ''
      } ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      {item ? (
        <>
          <Image
            src={`/items/${item.image}`}
            width={80}
            height={80}
            alt={item.title}
            className={`pointer-events-none mx-auto h-[75%] w-[75%] select-none object-contain object-center ${label ? 'mt-0' : 'mt-2'}`}
            quality={100}
            unoptimized={true}
          />
          {showAmount && item.amount && (
            <div className="font-pixel text-main-gray absolute bottom-2 right-2 text-sm font-bold">
              {item.amount}
            </div>
          )}
        </>
      ) : placeholder ? (
        <Image
          src={placeholder}
          width={80}
          height={80}
          alt={placeholderAlt}
          className={`pointer-events-none mx-auto h-[75%] w-[75%] select-none object-contain object-center opacity-50 ${label ? 'mt-0' : 'mt-2'}`}
        />
      ) : null}
      {label && (
        <div className="font-pixel absolute inset-x-0 bottom-1.5 mx-auto flex w-[75%] items-end justify-center pb-2 text-center text-[10px] font-bold text-[#747C8F]">
          {label}
        </div>
      )}
      <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
    </div>
  );
});
