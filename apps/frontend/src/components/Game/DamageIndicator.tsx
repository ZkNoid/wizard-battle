'use client';

import { motion, AnimatePresence } from 'motion/react';

interface DamageIndicatorProps {
  value: number;
  isVisible: boolean;
  isHeal?: boolean;
  position?: 'top' | 'center' | 'bottom';
  indicatorKey?: number;
}

export function DamageIndicator({
  value,
  isVisible,
  isHeal = false,
  position = 'top',
  indicatorKey,
}: DamageIndicatorProps) {
  const verticalPosition =
    position === 'top'
      ? '-top-5'
      : position === 'bottom'
        ? 'bottom-0'
        : 'top-1/2 -translate-y-1/2';

  const textColor = isHeal ? 'text-green-500' : 'text-red-600';
  const shadowColor1 = isHeal ? '#00ff00' : '#ff0000';
  const shadowColor2 = isHeal ? '#00cc00' : '#cc0000';
  const glowColor = isHeal ? 'rgba(0,255,0,0.8)' : 'rgba(255,0,0,0.8)';
  const filterGlow = isHeal ? 'rgba(0,255,0,0.6)' : 'rgba(255,0,0,0.6)';
  const sign = isHeal ? '+' : '-';

  if (!isVisible) return null;

  return (
    <motion.div
      key={`indicator-${indicatorKey ?? value}-${isHeal ? 'heal' : 'damage'}`}
      className={`pointer-events-none absolute left-1/3 ${verticalPosition} z-50 -translate-x-1/2`}
      initial={{ opacity: 0, y: 0, scale: 0.3 }}
      animate={{ opacity: [0, 1, 1, 0], y: -80, scale: [0.3, 1.2, 1, 0.8] }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 2,
        ease: 'easeOut',
        times: [0, 0.2, 0.7, 1],
      }}
      onAnimationComplete={() => {
        // Animation completed, component will be removed by parent
      }}
    >
      <span
        className={`font-pixel text-3xl font-black ${textColor}`}
        style={{
          textShadow: `3px 3px 0px ${shadowColor1}, 6px 6px 0px ${shadowColor2}, 0px 0px 20px ${glowColor}`,
          filter: `drop-shadow(0 0 8px ${filterGlow})`,
        }}
      >
        {sign}
        {Math.round(value)}
      </span>
    </motion.div>
  );
}
