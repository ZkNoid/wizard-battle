import { memo } from 'react';
import type { IEntity } from '../types/IEntity';
import type { AnimationConfig } from '../types/animation';
import { AnimatedCanvas } from '../components/AnimatedCanvas';
import { useEntityAnimations } from '../hooks/useEntityAnimations';

// Spectral wizard uses the same animations as the regular wizard
// but with a ghostly visual effect applied via CSS
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

export const SpectralPhantomDuelist = memo(({ entity }: { entity: IEntity }) => {
  // Use the mirrorEntityId if provided, otherwise use the entity's own id
  const animationEntityId = entity.mirrorEntityId ?? entity.id;

  const { animation, image, isPlaying, isLoading, error, scale } =
    useEntityAnimations({
      entityId: animationEntityId,
      animations: animations,
      defaultAnimation: 'idle',
      defaultScale: 1,
    });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border-2 border-cyan-700 bg-cyan-500/50 text-xs font-bold text-white shadow-lg">
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
    <div
      className="h-full w-full"
      style={{
        // Ghostly effect: semi-transparent with cyan/blue tint
        filter: 'hue-rotate(180deg) saturate(1.5) brightness(1.3)',
        opacity: 0.7,
        // Add a subtle glow effect
        mixBlendMode: 'screen',
      }}
    >
      <AnimatedCanvas
        animation={animation}
        image={image}
        playing={isPlaying}
        scale={scale}
        entityId={entity.id}
      />
    </div>
  );
});

SpectralPhantomDuelist.displayName = 'SpectralPhantomDuelist';
