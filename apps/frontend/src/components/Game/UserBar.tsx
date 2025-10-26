import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { WizardNameBackground } from './assets/wizard-name-background';
import { WizardTypeBackground } from './assets/wizard-type-background';
import { WizardStaffIcon } from './assets/wizard-staff-icon';
import { HpBackground } from './assets/hp-background';
import { LvlBackground } from './assets/lvl-background';
import { WarriorSwordIcon } from './assets/warrior-sword-icon';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { DamageIndicator } from './DamageIndicator';

export function UserBar({
  name,
  playerId,
  level,
  health,
  maxHealth,
  wizardType,
  className,
  onMouseEnter,
  onMouseLeave,
  showId,
}: {
  name: string;
  playerId?: string;
  level: number;
  health: number;
  maxHealth: number;
  wizardType: 'wizard' | 'warrior' | 'archer';
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  showId?: boolean;
}) {
  const healthPercentage = (health / maxHealth) * 100;

  // Track damage indicators
  const [showDamage, setShowDamage] = useState(false);
  const [damageValue, setDamageValue] = useState(0);
  const previousHealthRef = useRef(health);
  const isInitialized = useRef(false);

  useEffect(() => {
    const previousHealth = previousHealthRef.current;

    // Don't show damage on first render
    if (!isInitialized.current) {
      isInitialized.current = true;
      previousHealthRef.current = health;
      return;
    }

    if (previousHealth > health) {
      const damage = previousHealth - health;
      setDamageValue(damage);
      setShowDamage(true);

      // Hide damage indicator after animation
      const timer = setTimeout(() => {
        setShowDamage(false);
      }, 800);

      return () => clearTimeout(timer);
    }

    previousHealthRef.current = health;
  }, [health]);

  return (
    <div className={cn('relative flex flex-row items-center gap-0', className)}>
      {/* Damage Indicator */}
      <DamageIndicator
        damage={damageValue}
        isVisible={showDamage}
        position="top"
      />

      {/* Avatar */}
      <div className="w-35 h-35 border-3 border-main-gray overflow-hidden bg-[#FBFAFA]">
        {wizardType === 'wizard' && (
          <Image
            src={'/wizards/avatars/wizard.png'}
            width={140}
            height={140}
            quality={100}
            unoptimized={true}
            alt="wizard"
            className="h-full w-full"
          />
        )}
        {wizardType === 'warrior' && (
          <Image
            src={'/wizards/avatars/warrior.png'}
            width={140}
            height={140}
            quality={100}
            unoptimized={true}
            alt="warrior"
            className="h-full w-full"
          />
        )}
        {wizardType === 'archer' && (
          <Image
            src={'/wizards/avatars/archer.png'}
            width={140}
            height={140}
            quality={100}
            unoptimized={true}
            alt="archer"
            className="h-full w-full"
          />
        )}
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
            <div
              className="relative -ml-5 mt-1.5 flex h-12 w-60 cursor-pointer items-center justify-center"
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
            >
              <span className="font-pixel text-base text-[#070C19]">
                {showId && playerId ? `ID: ${playerId}` : name}
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
