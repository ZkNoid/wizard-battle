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

  // Track damage/heal indicators
  const [showIndicator, setShowIndicator] = useState(false);
  const [indicatorValue, setIndicatorValue] = useState(0);
  const [isHeal, setIsHeal] = useState(false);
  const [indicatorKey, setIndicatorKey] = useState(0);
  const previousHealthRef = useRef(health);
  const isInitialized = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isAnimatingRef = useRef(false);
  const lastShownHealthRef = useRef<number | null>(null);
  const lastShownTimeRef = useRef<number>(0);

  useEffect(() => {
    const previousHealth = previousHealthRef.current;

    // Don't show indicator on first render
    if (!isInitialized.current) {
      isInitialized.current = true;
      previousHealthRef.current = health;
      return;
    }

    // Ignore if health hasn't actually changed (prevent duplicate triggers from same value)
    if (Math.abs(health - previousHealth) < 0.01) {
      return;
    }

    // Don't trigger if already animating - accumulate changes instead
    if (isAnimatingRef.current) {
      // Store the accumulated change but don't show yet
      const accumulatedDiff = health - previousHealthRef.current;
      previousHealthRef.current = health;

      // Will process when animation finishes
      return;
    }

    const healthDiff = health - previousHealth;

    // Only show indicator if there's a meaningful change (more than 0.5 to avoid floating point issues)
    if (Math.abs(healthDiff) > 0.5) {
      const now = Date.now();
      const timeSinceLastShow = now - lastShownTimeRef.current;
      const sameValueAsLastShow =
        lastShownHealthRef.current !== null &&
        Math.abs(lastShownHealthRef.current - health) < 0.1;

      // Prevent duplicate shows within 500ms for the same health value (debounce)
      if (sameValueAsLastShow && timeSinceLastShow < 500) {
        previousHealthRef.current = health;
        return;
      }

      // Prevent duplicate shows - check if we're already showing this exact value
      if (
        showIndicator &&
        Math.abs(indicatorValue - Math.abs(healthDiff)) < 0.1
      ) {
        previousHealthRef.current = health;
        return;
      }

      // Clear any existing timer (shouldn't happen but safety check)
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Mark as animating BEFORE updating state
      isAnimatingRef.current = true;

      const newValue = Math.abs(healthDiff);
      const newIsHeal = healthDiff > 0;
      const newKey = indicatorKey + 1;

      // Record that we're showing this health value now
      lastShownHealthRef.current = health;
      lastShownTimeRef.current = now;

      // Update values and increment key to force new animation
      setIndicatorValue(newValue);
      setIsHeal(newIsHeal);
      setIndicatorKey(newKey);

      // Update previous health BEFORE showing indicator to prevent duplicate triggers
      previousHealthRef.current = health;

      setShowIndicator(true);

      // Hide indicator after animation (2 seconds for full animation)
      timerRef.current = setTimeout(() => {
        setShowIndicator(false);
        isAnimatingRef.current = false;
      }, 2100);
    } else {
      // Small change, just update the ref without showing indicator
      previousHealthRef.current = health;
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [health]);

  return (
    <div className={cn('relative flex flex-row items-center gap-0', className)}>
      {/* Damage/Heal Indicator */}
      {showIndicator && (
        <DamageIndicator
          value={indicatorValue}
          isVisible={showIndicator}
          isHeal={isHeal}
          position="top"
          indicatorKey={indicatorKey}
        />
      )}

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
