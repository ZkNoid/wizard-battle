'use client';

import { useState } from 'react';
import { Button } from '../shared/Button';
import Image from 'next/image';
import { CraftForm } from './CraftForm';
import { UpgradeForm } from './UpgradeForm';
import { UnityForm } from './UnityForm';
import { CraftBg } from './assets/craft-bg';

export default function CraftModal() {
  const [activeTab, setActiveTab] = useState<string>('craft');

  const buttonClassName =
    'flex h-20 flex-1 flex-row items-center justify-center gap-2.5';
  const iconClassName = 'h-7 w-8 object-contain object-center';
  const textClassName = 'font-pixel text-main-gray text-lg font-bold';

  const getButtonVariant = (tabName: string): 'gray' | 'blue' => {
    return activeTab === tabName ? 'blue' : 'gray';
  };

  const getForm = (tabName: string): React.ReactNode => {
    switch (tabName) {
      case 'craft':
        return <CraftForm />;
      case 'upgrade':
        return <UpgradeForm />;
      case 'unite':
        return <UnityForm />;
      default:
        return null;
    }
  };

  return (
    <div className="w-170 h-189 relative -mb-2.5">
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
      <div className="h-170 relative w-full">
        <div className="w-full pb-5 pt-2.5">{getForm(activeTab)}</div>
        <CraftBg className="-z-6 absolute inset-0 size-full h-full w-full" />
      </div>
    </div>
  );
}
