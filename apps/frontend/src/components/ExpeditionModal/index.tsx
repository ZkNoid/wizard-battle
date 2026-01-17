'use client';

import { useState } from 'react';
import { Button } from '../shared/Button';
import NewExpeditionForm from './NewExpeditionForm';
import CurrentExpeditionsForm from './CurrentExpeditionsForm';
import { ExpeditionsBg } from './assets/expeditions-bg';

export default function ExpeditionModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<
    'new-expedition' | 'current-expedition'
  >('new-expedition');

  const getButtonVariant = (tabName: string): 'gray' | 'blue' | 'lightGray' => {
    return activeTab === tabName ? 'gray' : 'lightGray';
  };

  const buttonClassName =
    'flex h-20 w-96 flex-row items-center justify-center gap-2.5';
  const textClassName =
    'font-pixel text-main-gray text-lg font-bold whitespace-nowrap';

  const getForm = (tabName: string): React.ReactNode => {
    switch (tabName) {
      case 'new-expedition':
        return <NewExpeditionForm onClose={onClose} />;
      case 'current-expedition':
        return <CurrentExpeditionsForm onClose={onClose} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
      <div
        className="w-200 h-265 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full flex-row justify-between gap-1 px-5">
          <Button
            variant={getButtonVariant('new-expedition')}
            className={buttonClassName}
            onClick={() => setActiveTab('new-expedition')}
          >
            <span className={textClassName}>Start New Expedition</span>
          </Button>
          <Button
            variant={getButtonVariant('current-expedition')}
            className={buttonClassName}
            onClick={() => setActiveTab('current-expedition')}
          >
            <span className={textClassName}>Current Expeditions</span>
          </Button>
        </div>
        <div className="h-250 relative z-10 -mt-8 w-full">
          <div className="h-full w-full px-4 py-4">{getForm(activeTab)}</div>
          <ExpeditionsBg className="absolute inset-0 -z-10 size-full h-full w-full" />
        </div>
      </div>
    </div>
  );
}
