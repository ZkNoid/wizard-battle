import Image from 'next/image';
import { ItemBg } from '../../InventoryModal/assets/item-bg';
import type { IInventoryItem } from '@/lib/types/Inventory';

interface ItemSlotProps {
  item?: IInventoryItem | null;
  placeholder?: string;
  placeholderAlt?: string;
  label?: string;
  onDrop?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onClick?: () => void;
  showAmount?: boolean;
  className?: string;
}

export function ItemSlot({
  item,
  placeholder,
  placeholderAlt = 'placeholder',
  label,
  onDrop,
  onDragOver,
  onClick,
  showAmount = false,
  className = '',
}: ItemSlotProps) {
  return (
    <div
      className={`size-25 relative cursor-pointer p-5 transition-all duration-200 ${className}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={onClick}
    >
      {item ? (
        <>
          <Image
            src={`/items/${item.image}`}
            width={100}
            height={100}
            alt={item.title}
            className={`pointer-events-none size-full select-none object-contain object-center ${label ? '-mt-2' : ''}`}
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
          width={100}
          height={100}
          alt={placeholderAlt}
          className={`pointer-events-none size-full select-none object-contain object-center ${label ? '-mt-2' : ''}`}
        />
      ) : null}
      {label && (
        <div className="font-pixel absolute inset-x-0 bottom-0 flex items-end justify-center pb-2 text-center text-[9px] font-bold text-[#747C8F]">
          {label}
        </div>
      )}
      <ItemBg className="-z-1 pointer-events-none absolute inset-0 size-full select-none" />
    </div>
  );
}
