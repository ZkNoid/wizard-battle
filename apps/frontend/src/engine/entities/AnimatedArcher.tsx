import { memo } from 'react';
import type { IEntity } from '../types/IEntity';
import type { AnimationConfig } from '../types/animation';
import { AnimatedCanvas } from '../components/AnimatedCanvas';
import { useEntityAnimations } from '../hooks/useEntityAnimations';

const animations: Record<string, AnimationConfig> = {
  idle: {
    name: 'idle',
    spritesheetJson: '/assets/spritesheets/archer/idle.json',
    spritesheetImage: '/assets/spritesheets/archer/idle.png',
    loop: true,
    scale: 1.5,
  },
  arrow: {
    name: 'arrow',
    spritesheetJson: '/assets/spritesheets/archer/arrow.json',
    spritesheetImage: '/assets/spritesheets/archer/arrow.png',
    loop: false,
    scale: 1,
  },
  hailofarrows: {
    name: 'hailofarrows',
    spritesheetJson: '/assets/spritesheets/archer/hailOfArrows.json',
    spritesheetImage: '/assets/spritesheets/archer/hailOfArrows.png',
    loop: false,
    scale: 1,
  },
  aimingshot: {
    name: 'aimingshot',
    spritesheetJson: '/assets/spritesheets/archer/arrow.json', // Arrow for now
    spritesheetImage: '/assets/spritesheets/archer/arrow.png',
    loop: false,
    scale: 1,
  },
  decoy: {
    name: 'decoy',
    spritesheetJson: '/assets/spritesheets/archer/decoy.json',
    spritesheetImage: '/assets/spritesheets/archer/decoy.png',
    loop: false,
    scale: 1,
  },
  smokeCloud: {
    name: 'smokeCloud',
    spritesheetJson: '/assets/spritesheets/archer/smokeCloud.json',
    spritesheetImage: '/assets/spritesheets/archer/smokeCloud.png',
    loop: false,
    scale: 1,
  },
};

export const AnimatedArcher = memo(({ entity }: { entity: IEntity }) => {
  const { animation, image, isPlaying, isLoading, error, scale } =
    useEntityAnimations({
      entityId: entity.id,
      animations: animations,
      defaultAnimation: 'idle',
      defaultScale: 1.5,
    });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border-2 border-purple-700 bg-purple-500 text-xs font-bold text-white shadow-lg">
        Loading...
      </div>
    );
  }

  if (error || !animation || !image) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border-2 border-red-700 bg-red-500 text-xs font-bold text-white shadow-lg">
        Error
      </div>
    );
  }

  return (
    <AnimatedCanvas
      animation={animation}
      image={image}
      playing={isPlaying}
      scale={scale}
      entityId={entity.id}
    />
  );
});

AnimatedArcher.displayName = 'AnimatedArcher';
