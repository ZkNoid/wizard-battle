'use client';

interface BuyItemsFormProps {
  onClose?: () => void;
}

export function BuyItemsForm({ onClose }: BuyItemsFormProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <span className="font-pixel text-main-gray text-xl">Buy Items</span>
      <span className="font-pixel text-main-gray/50 text-sm">Coming soon...</span>
    </div>
  );
}
