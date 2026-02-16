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
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Duelist_Idle.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Duelist_Idle.png',
    loop: true,
    scale: 1.5,
  },
  spectral_arrow: {
    name: 'spectral_arrow',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Spectral_Arrow.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Spectral_Arrow.png',
    loop: false,
    scale: 3,
  },
  shadow_veil: {
    name: 'shadow_veil',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Shadow_Veil.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Shadow_Veil.png',
    loop: false,
    scale: 3,
  },
  dusks_embrace: {
    name: 'dusks_embrace',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Dusk_Embrance.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Dusk_Embrance.png',
    loop: false,
    scale: 3,
  },
  phantom_echo: {
    name: 'phantom_echo',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Phantom_Echo.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Phantom_Echo.png',
    loop: false,
    scale: 3,
  },
  shadow_strike: {
    name: 'shadow_strike',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Shadow_Strike.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Shadow_Strike.png',
    loop: false,
    scale: 3,
  },
  shadow_dash: {
    name: 'shadow_dash',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Shadow_Dash.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Shadow_Dash.png',
    loop: false,
    scale: 3,
  },
  shadow_dash_move: {
    name: 'shadow_dash_move',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Shadow_Dash.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Shadow_Dash.png',
    loop: false,
    scale: 3,
  },
  whirling_blades: {
    name: 'whirling_blades',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Whiring_Blades.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Whiring_Blades.png',
    loop: false,
    scale: 3,
  },
  spectral_projection: {
    name: 'spectral_projection',
    spritesheetJson:
      '/assets/spritesheets/phantom_duelist/Spectral_Projection.json',
    spritesheetImage:
      '/assets/spritesheets/phantom_duelist/Spectral_Projection.png',
    loop: false,
    scale: 1,
  },
  phantom_armor: {
    name: 'phantom_armor',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Phantom_Armor.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Phantom_Armor.png',
    loop: false,
    scale: 1,
  },
  dead: {
    name: 'dead',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Duelist_Death.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Duelist_Death.png',
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
        opacity: 0.3,
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
