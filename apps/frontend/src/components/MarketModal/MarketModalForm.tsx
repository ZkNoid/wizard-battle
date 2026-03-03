'use client';

import { useState } from 'react';
import { Button } from '../shared/Button';
import { BuyItemsForm } from './BuyItemsForm';
import { ItemsSellingForm } from './ItemsSellingForm';
import { TradingHistoryForm } from './TradingHistoryForm';
import { MarketModalBg } from './assets/market-modal-bg';

interface MarketModalFormProps {
  onClose?: () => void;
}

export function MarketModalForm({ onClose }: MarketModalFormProps) {
  const [activeTab, setActiveTab] = useState<string>('buy');

  const buttonClassName =
    'flex h-20 flex-1 flex-row items-center justify-center gap-2.5';
  const textClassName = 'font-pixel text-main-gray text-lg font-bold';

  const getButtonVariant = (tabName: string): 'gray' | 'lightGray' => {
    return activeTab === tabName ? 'gray' : 'lightGray';
  };

  const getForm = (tabName: string): React.ReactNode => {
    switch (tabName) {
      case 'buy':
        return <BuyItemsForm onClose={onClose} />;
      case 'selling':
        return <ItemsSellingForm onClose={onClose} />;
      case 'history':
        return <TradingHistoryForm onClose={onClose} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-320 h-220 relative" onClick={(e) => e.stopPropagation()}>
      <div className="relative z-0 flex flex-row gap-2.5 px-5">
        <Button
          variant={getButtonVariant('buy')}
          className={buttonClassName}
          onClick={() => setActiveTab('buy')}
          enableHoverSound
          enableClickSound
        >
          <span className={textClassName}>Buy items</span>
        </Button>
        <Button
          variant={getButtonVariant('selling')}
          className={buttonClassName}
          onClick={() => setActiveTab('selling')}
          enableHoverSound
          enableClickSound
        >
          <span className={textClassName}>Items you are selling</span>
        </Button>
        <Button
          variant={getButtonVariant('history')}
          className={buttonClassName}
          onClick={() => setActiveTab('history')}
          enableHoverSound
          enableClickSound
        >
          <span className={textClassName}>Trading history</span>
        </Button>
      </div>
      <div className="h-200 relative z-10 -mt-5 w-full">
        <div className="h-full w-full px-4 py-4">{getForm(activeTab)}</div>
        <MarketModalBg className="absolute inset-0 -z-10 size-full h-full w-full" />
      </div>
    </div>
  );
}
