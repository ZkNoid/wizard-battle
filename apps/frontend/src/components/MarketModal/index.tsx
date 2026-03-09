'use client';

import { useEffect } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { MarketModalForm } from './MarketModalForm';
import { useModalSound } from '@/lib/hooks/useAudio';
import { useMarketStore } from '@/lib/store';

export default function MarketModal({ onClose }: { onClose: () => void }) {
  useModalSound();

  const { address } = useAppKitAccount();
  const { loadAll, clearMarketData } = useMarketStore();

  useEffect(() => {
    loadAll(address);

    return () => {
      clearMarketData();
    };
  }, [address, loadAll, clearMarketData]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
      <MarketModalForm onClose={onClose} />
    </div>
  );
}
