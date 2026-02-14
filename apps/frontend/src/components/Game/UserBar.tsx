import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { WizardNameBackground } from './assets/wizard-name-background';
import { WizardTypeBackground } from './assets/wizard-type-background';
import { WizardStaffIcon } from './assets/wizard-staff-icon';
import { HpBackground } from './assets/hp-background';
import { LvlBackground } from './assets/lvl-background';
import { WarriorSwordIcon } from './assets/warrior-sword-icon';
import Image from 'next/image';
import { useState, useEffect, useRef, useMemo } from 'react';
import { DamageIndicator } from './DamageIndicator';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { allEffectsInfo } from '../../../../common/stater/effects/effects';
import { Field } from 'o1js';

// Effect icon component - displays small icons for active effects
function EffectIcon({
  effectName,
  duration,
}: {
  effectName: string;
  duration: number;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getEffectStyle = (name: string) => {
    // Map effect names to icons, colors and descriptions
    const effectStyles: Record<
      string,
      {
        icon: React.ReactNode;
        color: string;
        bgColor: string;
        description: string;
      }
    > = {
      Invisible: {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M3 3l18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ),
        color: '#A78BFA',
        bgColor: '#4C1D95',
        description: 'Your position is hidden from the enemy.',
      },
      ShadowVeilInvisible: {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M3 3l18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ),
        color: '#C4B5FD',
        bgColor: '#5B21B6',
        description: 'Shadow veil conceals your position from enemies.',
      },
      Bleeding: {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M12 2c-4.97 8.29-8 11.76-8 15.5 0 4.14 3.58 5.5 8 5.5s8-1.36 8-5.5c0-3.74-3.03-7.21-8-15.5z" />
          </svg>
        ),
        color: '#EF4444',
        bgColor: '#7F1D1D',
        description: 'Takes 20 damage at the end of each turn.',
      },
      Slowing: {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 6v6l4 2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ),
        color: '#60A5FA',
        bgColor: '#1E3A8A',
        description: 'Movement speed is reduced by 1.',
      },
      Weaken: {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M12 2v20M2 12h20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M6 6l12 12M18 6l-12 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        ),
        color: '#F97316',
        bgColor: '#7C2D12',
        description: 'Defense reduced by 30%. Takes more damage from attacks.',
      },
      Revealed: {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <path
              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        ),
        color: '#FBBF24',
        bgColor: '#78350F',
        description: 'Your true position is visible to the enemy.',
      },
      Vulnerable: {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-4.5-6.5 4.5 2-7.5L2 9h7l3-7z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="currentColor"
              fillOpacity="0.3"
            />
          </svg>
        ),
        color: '#F472B6',
        bgColor: '#831843',
        description:
          'Defense reduced by 50%. Receives significantly more damage.',
      },
      Immobilize: {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <circle
              cx="12"
              cy="12"
              r="8"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M8 8l8 8M16 8l-8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ),
        color: '#94A3B8',
        bgColor: '#334155',
        description: 'Cannot move. Speed reduced to 0.',
      },
      Decoy: {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <circle
              cx="12"
              cy="8"
              r="4"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M4 20c0-4 4-6 8-6s8 2 8 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
          </svg>
        ),
        color: '#A78BFA',
        bgColor: '#4C1D95',
        description: 'A phantom decoy shows a fake position to the enemy.',
      },
      Cloud: {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
          </svg>
        ),
        color: '#D1D5DB',
        bgColor: '#374151',
        description: 'A smoke cloud hides anyone within 2 tiles of its center.',
      },
    };

    // Get style or use default
    return (
      effectStyles[name] || {
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <circle cx="12" cy="12" r="8" />
          </svg>
        ),
        color: '#9CA3AF',
        bgColor: '#374151',
        description: 'Unknown effect.',
      }
    );
  };

  const style = getEffectStyle(effectName);

  return (
    <div
      className="relative flex h-6 w-6 cursor-help items-center justify-center rounded border-2"
      style={{
        backgroundColor: style.bgColor,
        borderColor: style.color,
        color: style.color,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {style.icon}
      {duration > 0 && (
        <span
          className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full text-[8px] font-bold"
          style={{ backgroundColor: style.color, color: style.bgColor }}
        >
          {duration}
        </span>
      )}
      {/* Tooltip */}
      {showTooltip && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 min-w-48 max-w-64 -translate-x-1/2 rounded-lg px-3 py-2 shadow-lg"
          style={{
            backgroundColor: style.bgColor,
            border: `2px solid ${style.color}`,
          }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-sm font-bold"
                style={{ color: style.color }}
              >
                {effectName}
              </span>
              {duration > 0 && (
                <span
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{ backgroundColor: style.color, color: style.bgColor }}
                >
                  {duration} {duration === 1 ? 'turn' : 'turns'}
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-gray-300">
              {style.description}
            </p>
          </div>
          {/* Tooltip arrow */}
          <div
            className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${style.color}`,
            }}
          />
        </div>
      )}
    </div>
  );
}

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
  isAlly = true,
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
  isAlly?: boolean;
}) {
  const healthPercentage = (health / maxHealth) * 100;

  // Get state from store to access effects
  const { stater, opponentState } = useUserInformationStore();

  // Get active effects for this player
  const activeEffects = useMemo(() => {
    const state = isAlly ? stater?.state : opponentState;
    if (!state) return [];

    const effects: { name: string; duration: number }[] = [];

    // Collect effects from all effect arrays
    const allEffectArrays = [
      state.endOfRoundEffects,
      state.publicStateEffects,
      state.onEndEffects,
    ];

    for (const effectArray of allEffectArrays) {
      for (const effect of effectArray) {
        // Skip empty effects (effectId === 0)
        if (effect.effectId.equals(Field(0)).toBoolean()) continue;

        // Find effect info by ID
        const effectInfo = allEffectsInfo.find((info) =>
          info.id.equals(effect.effectId).toBoolean()
        );

        if (effectInfo) {
          // Skip "restoration" effects from display (these are internal effects)
          if (
            effectInfo.name.includes('Restoration') ||
            effectInfo.name.includes('Return')
          )
            continue;

          // Check if this effect is already in the list (avoid duplicates)
          const existing = effects.find((e) => e.name === effectInfo.name);
          if (!existing) {
            effects.push({
              name: effectInfo.name,
              duration: Number(effect.duration.toString()),
            });
          }
        }
      }
    }

    return effects;
  }, [stater, opponentState, isAlly]);

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
      <div className="border-3 border-main-gray h-30 w-30 overflow-hidden bg-[#FBFAFA]">
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
            {/* Effect Icons */}
            {activeEffects.length > 0 && (
              <div className="ml-1 mt-1.5 flex flex-row gap-1">
                {activeEffects.map((effect, index) => (
                  <EffectIcon
                    key={`${effect.name}-${index}`}
                    effectName={effect.name}
                    duration={effect.duration}
                  />
                ))}
              </div>
            )}
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
