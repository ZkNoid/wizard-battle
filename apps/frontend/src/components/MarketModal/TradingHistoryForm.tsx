'use client';

interface TradingHistoryFormProps {
  onClose?: () => void;
}

export function TradingHistoryForm({ onClose }: TradingHistoryFormProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <span className="font-pixel text-main-gray text-xl">Trading History</span>
      <span className="font-pixel text-main-gray/50 text-sm">Coming soon...</span>
    </div>
  );
}
