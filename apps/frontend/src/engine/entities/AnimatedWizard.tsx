import { memo } from 'react';
import type { IEntity } from '../types/IEntity';
import type { AnimationConfig } from '../types/animation';
import { AnimatedCanvas } from '../components/AnimatedCanvas';
import { useEntityAnimations } from '../hooks/useEntityAnimations';

const animations: Record<string, AnimationConfig> = {
  idle: {
    name: 'idle',
    spritesheetJson: '/assets/spritesheets/Sourcer_Idle.json',
    spritesheetImage: '/assets/spritesheets/Sourcer_Idle.png',
    loop: true,
    scale: 1,
  },
  fireball: {
    name: 'fireball',
    spritesheetJson: '/assets/spritesheets/Sourcer_FireBall.json',
    spritesheetImage: '/assets/spritesheets/Sourcer_FireBall_Spritelist.png',
    loop: false,
    scale: 3,
  },
  lightning: {
    name: 'lightning',
    spritesheetJson: '/assets/spritesheets/Sourcer_Lightning.json',
    spritesheetImage: '/assets/spritesheets/Sourcer_Lightning_Spritelist.png',
    loop: false,
    scale: 1,
  },
  teleportStart: {
    name: 'teleportStart',
    spritesheetJson: '/assets/spritesheets/Sourcer_Teleport_Start.json',
    spritesheetImage:
      '/assets/spritesheets/Sourcer_Teleport_Start_Spritelist.png',
    loop: false,
    scale: 1,
  },
  teleportFinish: {
    name: 'teleportFinish',
    spritesheetJson: '/assets/spritesheets/Sourcer_Teleport_Finish.json',
    spritesheetImage:
      '/assets/spritesheets/Sourcer_Teleport_Finish_Spritelist.png',
    loop: false,
    scale: 1,
  },
  laser: {
    name: 'laser',
    spritesheetJson: '/assets/spritesheets/Sourcer_Laser.json',
    spritesheetImage: '/assets/spritesheets/Sourcer_Laser_Spritelist.png',
    loop: false,
    scale: 1,
  },
  dead: {
    name: 'dead',
    spritesheetJson: '/assets/spritesheets/Sourcer_Dead.json',
    spritesheetImage: '/assets/spritesheets/Sourcer_Dead_Spritelist.png',
    loop: false,
    scale: 1,
  },
};

export const AnimatedWizard = memo(({ entity }: { entity: IEntity }) => {
  const { animation, image, isPlaying, isLoading, error, scale } =
    useEntityAnimations({
      entityId: entity.id,
      animations: animations,
      defaultAnimation: 'idle',
      defaultScale: 1,
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

AnimatedWizard.displayName = 'AnimatedWizard';
