'use client';

import { useState } from 'react';
import { Button } from '../shared/Button';
import Image from 'next/image';
import { CraftForm } from './CraftForm';
import { UpgradeForm } from './UpgradeForm';
import { UnityForm } from './UnityForm';
import { CraftBg } from './assets/craft-bg';

interface CraftModalFormProps {
  onClose?: () => void;
}

export function CraftModalForm({ onClose }: CraftModalFormProps) {
  const [activeTab, setActiveTab] = useState<string>('craft');

  const buttonClassName =
    'flex h-20 flex-1 flex-row items-center justify-center gap-2.5';
  const iconClassName = 'h-7 w-8 object-contain object-center';
  const textClassName = 'font-pixel text-main-gray text-lg font-bold';

  const getButtonVariant = (tabName: string): 'gray' | 'blue' | 'lightGray' => {
    return activeTab === tabName ? 'gray' : 'lightGray';
  };

  const getForm = (tabName: string): React.ReactNode => {
    switch (tabName) {
      case 'craft':
        return <CraftForm onCancel={onClose} />;
      case 'upgrade':
        return <UpgradeForm onCancel={onClose} />;
      case 'unite':
        return <UnityForm onCancel={onClose} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-150 h-199 relative" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-row gap-2.5 px-5">
        <Button
          variant={getButtonVariant('craft')}
          className={buttonClassName}
          onClick={() => setActiveTab('craft')}
        >
          <Image
            src="/icons/pickaxe.png"
            width={32}
            height={28}
            alt="pickaxe"
            className={iconClassName}
          />
          <span className={textClassName}>Craft</span>
        </Button>
        <Button
          variant={getButtonVariant('upgrade')}
          className={buttonClassName}
          onClick={() => setActiveTab('upgrade')}
        >
          <Image
            src="/icons/armor.png"
            width={32}
            height={28}
            alt="armor"
            className={iconClassName}
          />
          <span className={textClassName}>Upgrade</span>
        </Button>
        <Button
          variant={getButtonVariant('unite')}
          className={buttonClassName}
          onClick={() => setActiveTab('unite')}
        >
          <Image
            src="/icons/gem.png"
            width={32}
            height={28}
            alt="gem"
            className={iconClassName}
          />
          <span className={textClassName}>Unite</span>
        </Button>
      </div>
      <div className="h-185 relative -mt-5 w-full">
        <div className="h-full w-full px-4 py-4">{getForm(activeTab)}</div>
        <CraftBg className="absolute inset-0 -z-10 size-full h-full w-full" />
      </div>
    </div>
  );
}
