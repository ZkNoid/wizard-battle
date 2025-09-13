import { useState, useEffect } from 'react';
import type { Animation } from '../types/animation';
import { loadAnimation } from '../utils/animationLoader';
import {
  gameEventEmitter,
  type PlayAnimationEvent,
  type StopAnimationEvent,
} from '../gameEventEmitter';

interface UseAnimatedEntityProps {
  entityId: string;
  spritesheetJson: string;
  spritesheetImage: string;
  defaultAnimation?: string;
  defaultLoop?: boolean;
}

interface UseAnimatedEntityResult {
  animation: Animation | null;
  image: HTMLImageElement | null;
  isPlaying: boolean;
  currentAnimationName: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for animated entities
 */
export function useAnimatedEntity({
  entityId,
  spritesheetJson,
  spritesheetImage,
  defaultAnimation = 'idle',
  defaultLoop = true,
}: UseAnimatedEntityProps): UseAnimatedEntityResult {
  const [animation, setAnimation] = useState<Animation | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentAnimationName, setCurrentAnimationName] =
    useState(defaultAnimation);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Loading initial animation
  useEffect(() => {
    const loadInitialAnimation = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { animation: loadedAnimation, image: loadedImage } =
          await loadAnimation(
            spritesheetJson,
            spritesheetImage,
            defaultAnimation,
            defaultLoop
          );

        setAnimation(loadedAnimation);
        setImage(loadedImage);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load animation'
        );
        console.error('Failed to load animation:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialAnimation();
  }, [spritesheetJson, spritesheetImage, defaultAnimation, defaultLoop]);

  // Subscribing to animation events
  useEffect(() => {
    const handlePlayAnimation = (event: PlayAnimationEvent) => {
      if (event.entityId !== entityId) return;

      if (event.animationName === defaultAnimation && animation) {
        setCurrentAnimationName(event.animationName);
        setIsPlaying(true);
      }
    };

    const handleStopAnimation = (event: StopAnimationEvent) => {
      if (event.entityId !== entityId) return;
      setIsPlaying(false);
    };

    gameEventEmitter.onPlayAnimation(handlePlayAnimation);
    gameEventEmitter.onStopAnimation(handleStopAnimation);

    return () => {
      gameEventEmitter.offPlayAnimation(handlePlayAnimation);
      gameEventEmitter.offStopAnimation(handleStopAnimation);
    };
  }, [entityId, animation, defaultAnimation]);

  return {
    animation,
    image,
    isPlaying,
    currentAnimationName,
    isLoading,
    error,
  };
}
