import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { WizardNameBackground } from './assets/wizard-name-background';
import { WizardImage } from './assets/wizard-image';
import { WarriorImage } from './assets/warrior-image';
import { ElveImage } from './assets/elve-image';
import { WizardTypeBackground } from './assets/wizard-type-background';
import { WizardStaffIcon } from './assets/wizard-staff-icon';
import { HpBackground } from './assets/hp-background';
import { LvlBackground } from './assets/lvl-background';
import { WarriorSwordIcon } from './assets/warrior-sword-icon';

export function UserBar({
  name,
  level,
  health,
  maxHealth,
  wizardType,
  className,
}: {
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  wizardType: 'wizard' | 'warrior' | 'elve';
  className?: string;
}) {
  const healthPercentage = (health / maxHealth) * 100;

  return (
    <div className={cn('flex flex-row items-center gap-0', className)}>
      {/* Avatar */}
      <div className="w-35 h-35 border-3 border-main-gray overflow-hidden bg-[#FBFAFA]">
        {wizardType === 'wizard' && <WizardImage className="h-full w-full" />}
        {wizardType === 'warrior' && <WarriorImage className="h-full w-full" />}
        {wizardType === 'elve' && <ElveImage className="h-full w-full" />}
      </div>
      <div className="flex flex-col gap-0">
        <div className="-mb-3 flex flex-row items-center gap-1">
          <div className="flex flex-row gap-1">
            <div className="relative flex size-16 items-center justify-center">
              {wizardType === 'wizard' && (
                <WizardStaffIcon className="size-8" />
              )}
              {wizardType === 'warrior' && (
                <WarriorSwordIcon className="size-8" />
              )}
              <WizardTypeBackground className="-z-1 absolute inset-0 size-full" />
            </div>
            <div className="relative -ml-5 mt-1.5 flex h-12 w-60 items-center justify-center">
              <span className="font-pixel text-base text-[#070C19]">
                {name}
              </span>
              <WizardNameBackground className="-z-1 absolute inset-0 size-full" />
            </div>
          </div>
        </div>
        <div className="w-95 relative h-10">
          <HpBackground className="-z-1 absolute inset-0 size-full" />
          <motion.div
            className={'-z-2 absolute inset-0 mt-0.5 h-[90%] bg-[#FF3C3E]'}
            initial={{ width: '100%' }}
            animate={{
              width: `${healthPercentage == 100 ? 98 : healthPercentage}%`,
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
          <div
            className={
              '-z-3 absolute inset-0 mt-0.5 h-[90%] w-[98%] bg-[#D5D8DD]'
            }
          />
        </div>
        <div className="w-45 relative h-8">
          <span className="font-pixel absolute left-1 top-1 text-xs text-white">
            Lvl. {level}
          </span>
          <LvlBackground className="-z-1 absolute inset-0 size-full" />
        </div>
      </div>
    </div>
  );
}
