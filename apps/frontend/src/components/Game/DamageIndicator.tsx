'use client';

import { motion, AnimatePresence } from 'motion/react';

interface DamageIndicatorProps {
  damage: number;
  isVisible: boolean;
  position?: 'top' | 'center' | 'bottom';
}

export function DamageIndicator({
  damage,
  isVisible,
  position = 'top',
}: DamageIndicatorProps) {
  const verticalPosition =
    position === 'top'
      ? '-top-5'
      : position === 'bottom'
        ? 'bottom-0'
        : 'top-1/2 -translate-y-1/2';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`pointer-events-none absolute left-1/3 ${verticalPosition} z-50 -translate-x-1/2`}
          initial={{ opacity: 0, y: 0, scale: 0.3 }}
          animate={{ opacity: [0, 1, 1, 0], y: -80, scale: [0.3, 1.2, 1, 0.8] }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 2,
            ease: 'easeOut',
            times: [0, 0.2, 0.7, 1],
          }}
        >
          <span
            className="font-pixel text-3xl font-black text-red-600"
            style={{
              textShadow:
                '3px 3px 0px #ff0000, 6px 6px 0px #cc0000, 0px 0px 20px rgba(255,0,0,0.8)',
              filter: 'drop-shadow(0 0 8px rgba(255,0,0,0.6))',
            }}
          >
            -{damage}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
