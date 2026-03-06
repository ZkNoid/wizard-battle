'use client';

import Image from 'next/image';
import { Button } from '../Button';
import { BuyItemConfirmModalBg } from '../../MarketModal/assets/buy-item-confirm-modal-bg';

interface RequestResultModalProps {
  status: 'success' | 'failure';
  onClose: () => void;
}

const CONTENT = {
  success: {
    title: 'Success!',
    icon: '/icons/success.png',
    iconAlt: 'success',
    message: 'Your item has been successfully placed on the market.',
  },
  failure: {
    title: 'Failed',
    icon: '/icons/failed.png',
    iconAlt: 'failed',
    message: 'Unfortunately, something went wrong, try again later.',
  },
} as const;

export function RequestResultModal({
  status,
  onClose,
}: RequestResultModalProps) {
  const { title, icon, iconAlt, message } = CONTENT[status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="w-70 relative h-80" onClick={(e) => e.stopPropagation()}>
        <BuyItemConfirmModalBg className="pointer-events-none absolute inset-0 h-full w-full" />

        <div className="relative z-10 flex h-full flex-col items-center justify-between px-6 py-5">
          {/* Title */}
          <h2 className="font-pixel text-main-gray text-lg font-bold">
            {title}
          </h2>

          {/* Icon */}
          <Image
            src={icon}
            width={96}
            height={96}
            alt={iconAlt}
            className="h-24 w-24 object-contain"
            unoptimized
          />

          {/* Message */}
          <p className="font-pixel text-main-gray text-center text-xs leading-relaxed">
            {message}
          </p>

          {/* Okay button */}
          <Button
            variant="gray"
            className="h-10 w-full"
            onClick={onClose}
            enableHoverSound
            enableClickSound
          >
            <span className="font-pixel text-main-gray text-base font-bold">
              Okay
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
