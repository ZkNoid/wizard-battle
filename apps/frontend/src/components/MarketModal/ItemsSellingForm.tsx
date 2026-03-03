'use client';

interface ItemsSellingFormProps {
  onClose?: () => void;
}

export function ItemsSellingForm({ onClose }: ItemsSellingFormProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <span className="font-pixel text-main-gray text-xl">Items You Are Selling</span>
      <span className="font-pixel text-main-gray/50 text-sm">Coming soon...</span>
    </div>
  );
}
