import { useState, useEffect, useCallback } from 'react';
import { AnimatedCanvas } from './AnimatedCanvas';
import {
  gameEventEmitter,
  type ThrowEffectEvent,
  type RemoveEffectEvent,
} from '../gameEventEmitter';
import { loadAnimation } from '../utils/animationLoader';
import type { Animation } from '../types/animation';

interface EffectInstance {
  id: string;
  x: number;
  y: number;
  animation: Animation;
  image: HTMLImageElement;
  scale?: number;
  startTime: number;
}

const AVAILABLE_EFFECTS: Record<string, { json: string; image: string }> = {
  fireball: {
    json: '/assets/spritesheets/FireBall_Reaction.json',
    image: '/assets/spritesheets/FireBall_Reaction_Spritelist.png',
  },
  lightning: {
    json: '/assets/spritesheets/Sourcer_Lightning_Reaction.json',
    image: '/assets/spritesheets/Sourcer_Lightning_Reaction.png',
  },
  teleport: {
    json: '/assets/spritesheets/Sourcer_Teleport_Finish.json',
    image: '/assets/spritesheets/Sourcer_Teleport_Finish_Spritelist.png',
  },
  laser_center: {
    json: '/assets/spritesheets/Laser_Reaction_Center.json',
    image: '/assets/spritesheets/Laser_Reaction_Center.png',
  },
  laser_horisontal: {
    json: '/assets/spritesheets/Laser_Reaction_Left.json',
    image: '/assets/spritesheets/Laser_Reaction_Left.png',
  },
  laser_vertical: {
    json: '/assets/spritesheets/Laser_Reaction_Bottom.json',
    image: '/assets/spritesheets/Laser_Reaction_Bottom.png',
  },
};

export function EffectOverlay({
  overlayId,
  gridWidth,
  gridHeight,
  className = '',
}: {
  overlayId: string;
  gridWidth: number;
  gridHeight: number;
  className?: string;
}) {
  const [activeEffects, setActiveEffects] = useState<EffectInstance[]>([]);
  const [completedEffects, setCompletedEffects] = useState<string[]>([]);

  // Handle completed effects
  useEffect(() => {
    if (completedEffects.length > 0) {
      setActiveEffects((prev) =>
        prev.filter((effect) => !completedEffects.includes(effect.id))
      );
      setCompletedEffects([]);
    }
  }, [completedEffects]);

  // Handle remove effect events
  useEffect(() => {
    const handleRemoveEffect = (event: RemoveEffectEvent) => {
      const { effectId, overlayId: eventOverlayId } = event;

      // If event specifies an overlayId, only process if it matches
      if (eventOverlayId && eventOverlayId !== overlayId) {
        return; // Skip this event, it's not for this overlay
      }

      // Remove the effect by ID (search in active effects)
      setCompletedEffects((prev) => [...prev, effectId]);
    };

    gameEventEmitter.onRemoveEffect(handleRemoveEffect);

    return () => {
      gameEventEmitter.offRemoveEffect(handleRemoveEffect);
    };
  }, [overlayId]);

  useEffect(() => {
    const handleThrowEffect = async (event: ThrowEffectEvent) => {
      const {
        overlayId: eventOverlayId,
        animationName,
        x,
        y,
        scale,
        duration,
        loop,
        effectId,
      } = event;

      // Filter by overlayId if specified
      if (eventOverlayId && overlayId && eventOverlayId !== overlayId) {
        return; // Skip this event, it's not for this overlay
      }

      // If no overlayId specified in event and this overlay has an ID, skip
      if (!eventOverlayId && overlayId) {
        return;
      }

      // Check if the effect is available
      const effectConfig = AVAILABLE_EFFECTS[animationName];
      if (!effectConfig) {
        console.warn(
          `Effect '${animationName}' not found in available effects`
        );
        return;
      }

      try {
        // Load animation with loop parameter from event
        const shouldLoop = loop ?? false;
        const { animation, image } = await loadAnimation(
          effectConfig.json,
          effectConfig.image,
          animationName,
          shouldLoop
        );

        // Create effect instance using the ID from event
        const effectInstance: EffectInstance = {
          id: effectId,
          x,
          y,
          animation: {
            ...animation,
            oneTime: !shouldLoop, // One-time if not looping
            loop: shouldLoop,
            scale: scale || 1,
          },
          image,
          scale: scale || 1,
          startTime: Date.now(),
        };

        // Add effect to active list
        setActiveEffects((prev) => [...prev, effectInstance]);

        // If duration is specified, remove effect after this time
        if (duration) {
          setTimeout(() => {
            setCompletedEffects((prev) => [...prev, effectInstance.id]);
          }, duration);
        }
      } catch (error) {
        console.error(`Failed to load effect ${animationName}:`, error);
      }
    };

    gameEventEmitter.onThrowEffect(handleThrowEffect);

    return () => {
      gameEventEmitter.offThrowEffect(handleThrowEffect);
    };
  }, [overlayId]);

  // Handler for animation completion
  const handleEffectComplete = useCallback((effectId: string) => {
    // Use setTimeout to avoid setState during render
    setTimeout(() => {
      setCompletedEffects((prev) => [...prev, effectId]);
    }, 0);
  }, []);

  // Calculate effect position as percentage (same as EntityOverlay)
  const getEffectPosition = (x: number, y: number) => {
    const leftPosition = (x / gridWidth) * 100;
    const topPosition = (y / gridHeight) * 100;
    const effectWidth = (1 / gridWidth) * 100; // each effect occupies 1/8 = 12.5% width
    const effectHeight = (1 / gridHeight) * 100; // each effect occupies 1/8 = 12.5% height

    return {
      left: `${leftPosition}%`,
      top: `${topPosition}%`,
      width: `${effectWidth}%`,
      height: `${effectHeight}%`,
    };
  };

  return (
    <div
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    >
      {activeEffects.map((effect) => {
        const position = getEffectPosition(effect.x, effect.y);

        return (
          <div
            key={effect.id}
            className="absolute z-50"
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              height: position.height,
            }}
          >
            <AnimatedCanvas
              animation={effect.animation}
              image={effect.image}
              playing={true}
              scale={effect.scale}
              entityId={effect.id}
              onAnimationComplete={() => handleEffectComplete(effect.id)}
              className="absolute inset-0"
            />
          </div>
        );
      })}
    </div>
  );
}
