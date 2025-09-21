import { useState, useEffect, useRef, useMemo } from 'react';
import type { Animation, AnimationConfig } from '../types/animation';
import { loadAnimation } from '../utils/animationLoader';
import {
  gameEventEmitter,
  type PlayAnimationEvent,
  type StopAnimationEvent,
  type AnimationCompleteEvent,
} from '../gameEventEmitter';

interface UseEntityAnimationsProps {
  entityId: string;
  animations: Record<string, AnimationConfig>;
  defaultAnimation?: string;
  defaultScale?: number;
}

interface UseEntityAnimationsResult {
  animation: Animation | null;
  image: HTMLImageElement | null;
  isPlaying: boolean;
  currentAnimationName: string;
  isLoading: boolean;
  error: string | null;
  scale: number;
  isIdle: boolean;
}

interface LoadedAnimation {
  animation: Animation;
  image: HTMLImageElement;
}

/**
 * Universal hook for entity animations
 * Always works with a set of animations
 */
export function useEntityAnimations({
  entityId,
  animations,
  defaultAnimation = 'idle',
  defaultScale = 1,
}: UseEntityAnimationsProps): UseEntityAnimationsResult {
  const [loadedAnimations, setLoadedAnimations] = useState<
    Map<string, LoadedAnimation>
  >(new Map());
  const [currentAnimationName, setCurrentAnimationName] =
    useState<string>('idle');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [isIdle, setIsIdle] = useState(true);

  const currentAnimationRef = useRef<string>(defaultAnimation);
  const pendingAnimationRef = useRef<string | null>(null);
  const configRef = useRef<string>('');

  // Ensure idle animation exists
  if (!animations.idle) {
    throw new Error(
      `Entity ${entityId} must have an 'idle' animation configured`
    );
  }

  // Memoize animations configuration - use ref to prevent re-computation
  const animationsRef = useRef(animations);
  const stableAnimations = useMemo(() => {
    // Only update if animations actually changed (deep comparison of keys and basic props)
    const currentKeys = Object.keys(animations).sort();
    const refKeys = Object.keys(animationsRef.current).sort();

    if (
      currentKeys.length !== refKeys.length ||
      !currentKeys.every((key) => refKeys.includes(key))
    ) {
      console.log(`[Engine] Animation config changed for entity ${entityId}`);
      animationsRef.current = animations;
      return animations;
    }

    // Keep the existing reference if structure hasn't changed
    return animationsRef.current;
  }, [animations]);

  // Initialize state
  useEffect(() => {
    setCurrentAnimationName(defaultAnimation);
    setScale(defaultScale);
    currentAnimationRef.current = defaultAnimation;
  }, [defaultAnimation, defaultScale]);

  // Load all animations on mount - use a ref to prevent infinite loops
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Create a simple key based on animation names (much faster than full JSON)
    const animationKeys = Object.keys(stableAnimations).sort().join(',');
    const configKey = `${entityId}:${animationKeys}`;

    // Only reload if config actually changed and we're not already loading
    if (configRef.current === configKey || isLoadingRef.current) return;
    configRef.current = configKey;
    isLoadingRef.current = true;

    const loadAllAnimations = async () => {
      try {
        console.log(`[Engine] Loading animations for entity ${entityId}`);
        setIsLoading(true);
        setError(null);

        const animationPromises = Object.entries(stableAnimations).map(
          async ([name, animConfig]) => {
            const { animation, image } = await loadAnimation(
              animConfig.spritesheetJson,
              animConfig.spritesheetImage,
              name,
              animConfig.loop ?? true
            );

            // Apply scale from config
            const scaledAnimation = {
              ...animation,
              scale: animConfig.scale ?? defaultScale,
            };

            return [name, { animation: scaledAnimation, image }] as [
              string,
              LoadedAnimation,
            ];
          }
        );

        const results = await Promise.all(animationPromises);
        const animationMap = new Map(results);

        setLoadedAnimations(animationMap);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load animations'
        );
        console.error('Failed to load animations for entity:', entityId, err);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadAllAnimations();
  }, [entityId, stableAnimations, defaultScale]);

  // Handle animation events
  useEffect(() => {
    const handlePlayAnimation = (event: PlayAnimationEvent) => {
      if (event.entityId !== entityId) return;

      const { animationName, loop, oneTime, scale: eventScale } = event;

      // Check if animation exists
      if (!loadedAnimations.has(animationName)) {
        console.warn(
          `Animation '${animationName}' not found for entity ${entityId}`
        );
        return;
      }

      const loadedAnim = loadedAnimations.get(animationName)!;
      const animationConfig = stableAnimations[animationName];
      if (!animationConfig) {
        console.warn(
          `Animation config '${animationName}' not found for entity ${entityId}`
        );
        return;
      }

      // Update animation properties
      const updatedAnimation: Animation = {
        ...loadedAnim.animation,
        loop: oneTime ? false : (loop ?? animationConfig.loop ?? true),
        oneTime: oneTime ?? false,
        scale: eventScale ?? animationConfig.scale ?? defaultScale,
      };

      // Update the loaded animation in the map
      setLoadedAnimations((prev) => {
        const newMap = new Map(prev);
        newMap.set(animationName, {
          ...loadedAnim,
          animation: updatedAnimation,
        });
        return newMap;
      });

      setCurrentAnimationName(animationName);
      setScale(eventScale ?? animationConfig.scale ?? defaultScale);
      setIsPlaying(true);
      setIsIdle(animationName === 'idle');

      currentAnimationRef.current = animationName;

      // If it's a one-time animation, prepare to return to idle
      if (oneTime) {
        pendingAnimationRef.current = 'idle';
      } else {
        // Clear pending if it's not a one-time animation
        pendingAnimationRef.current = null;
      }
    };

    const handleStopAnimation = (event: StopAnimationEvent) => {
      if (event.entityId !== entityId) return;
      setIsPlaying(false);
    };

    const handleAnimationComplete = (event: AnimationCompleteEvent) => {
      if (event.entityId !== entityId) return;

      // If there's a pending animation (usually idle after one-time), switch to it
      if (pendingAnimationRef.current) {
        const nextAnimation = pendingAnimationRef.current;
        pendingAnimationRef.current = null;

        // Switch to the pending animation (usually idle)
        setCurrentAnimationName(nextAnimation);
        setIsIdle(nextAnimation === 'idle');
        setIsPlaying(true);
        currentAnimationRef.current = nextAnimation;

        // Reset scale to default if returning to idle
        if (nextAnimation === 'idle') {
          const idleConfig = stableAnimations.idle;
          if (idleConfig) {
            setScale(idleConfig.scale ?? defaultScale);
          }
        }
      }
    };

    gameEventEmitter.onPlayAnimation(handlePlayAnimation);
    gameEventEmitter.onStopAnimation(handleStopAnimation);
    gameEventEmitter.onAnimationComplete(handleAnimationComplete);

    return () => {
      gameEventEmitter.offPlayAnimation(handlePlayAnimation);
      gameEventEmitter.offStopAnimation(handleStopAnimation);
      gameEventEmitter.offAnimationComplete(handleAnimationComplete);
    };
  }, [entityId, loadedAnimations, stableAnimations, defaultScale]);

  const currentLoaded = loadedAnimations.get(currentAnimationName);

  return {
    animation: currentLoaded?.animation || null,
    image: currentLoaded?.image || null,
    isPlaying,
    currentAnimationName,
    isLoading,
    error,
    scale,
    isIdle,
  };
}
