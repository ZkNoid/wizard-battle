'use client';

import { useState } from 'react';
import { Button } from '../shared/Button';
import { CraftBg } from '../CraftModal/assets/craft-bg';
import { useModalSound } from '@/lib/hooks/useAudio';
import { TestnetTasks } from './TestnetTasks';
import { Leaderboard } from './Leaderboard';
import Image from 'next/image';

interface TestnetModalProps {
  onClose: () => void;
}

export default function TestnetModal({ onClose }: TestnetModalProps) {
  // Play modal sounds
  useModalSound();

  const [activeTab, setActiveTab] = useState<string>('tasks');

  const iconClassName = 'h-7 w-8 object-contain object-center';
  const buttonClassName =
    'flex h-20 flex-1 flex-row items-center justify-center gap-2.5';
  const textClassName = 'font-pixel text-main-gray text-lg font-bold';

  const getButtonVariant = (tabName: string): 'gray' | 'blue' | 'lightGray' => {
    return activeTab === tabName ? 'gray' : 'lightGray';
  };

  const getForm = (tabName: string): React.ReactNode => {
    switch (tabName) {
      case 'tasks':
        return <TestnetTasks onCancel={onClose} />;
      case 'leaderboard':
        return <Leaderboard onCancel={onClose} />;
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="w-150 h-199 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-0 flex flex-row gap-2.5 px-5">
          <Button
            variant={getButtonVariant('tasks')}
            className={buttonClassName}
            onClick={() => setActiveTab('tasks')}
            enableHoverSound
            enableClickSound
          >
            <Image
              src="/icons/task-list.png"
              width={32}
              height={28}
              alt="tasks"
              className={iconClassName}
            />
            <span className={textClassName}>Testnet tasks</span>
          </Button>
          <Button
            variant={getButtonVariant('leaderboard')}
            className={buttonClassName}
            onClick={() => setActiveTab('leaderboard')}
            enableHoverSound
            enableClickSound
          >
            <Image
              src="/icons/tournaments.png"
              width={32}
              height={28}
              alt="tournaments"
              className={iconClassName}
            />
            <span className={textClassName}>Leaderboard</span>
          </Button>
        </div>
        <div className="h-185 relative z-10 -mt-5 w-full">
          <div className="h-full w-full px-4 py-4">{getForm(activeTab)}</div>
          <CraftBg className="absolute inset-0 -z-10 size-full h-full w-full" />
        </div>
      </div>
    </div>
  );
}
