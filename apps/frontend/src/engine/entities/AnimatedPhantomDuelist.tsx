import { memo } from 'react';
import type { IEntity } from '../types/IEntity';
import type { AnimationConfig } from '../types/animation';
import { AnimatedCanvas } from '../components/AnimatedCanvas';
import { useEntityAnimations } from '../hooks/useEntityAnimations';

const scale = 1.5;

const animations: Record<string, AnimationConfig> = {
  idle: {
    name: 'idle',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Duelist_Idle.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Duelist_Idle.png',
    loop: true,
    scale: scale,
  },
  // Keys match spell.name.toLowerCase() (e.g. 'SpectralArrow' → 'spectralarrow')
  spectralarrow: {
    name: 'spectralarrow',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Spectral_Arrow.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Spectral_Arrow.png',
    loop: false,
    scale: 3 * scale,
  },
  shadowveil: {
    name: 'shadowveil',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Shadow_Veil.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Shadow_Veil.png',
    loop: false,
    scale: 3 * scale,
  },
  dusksembrace: {
    name: 'dusksembrace',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Dusk_Embrance.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Dusk_Embrance.png',
    loop: false,
    scale: 3 * scale,
  },
  phantomecho: {
    name: 'phantomecho',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Phantom_Echo.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Phantom_Echo.png',
    loop: false,
    scale: 3 * scale,
  },
  shadowstrike: {
    name: 'shadowstrike',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Shadow_Strike.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Shadow_Strike.png',
    loop: false,
    scale: 3 * scale,
  },
  shadowdash: {
    name: 'shadowdash',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Shadow_Dash.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Shadow_Dash.png',
    loop: false,
    scale: 3 * scale,
  },
  shadowdashmove: {
    name: 'shadowdashmove',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Shadow_Dash.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Shadow_Dash.png',
    loop: false,
    scale: 3 * scale,
  },
  whirlingblades: {
    name: 'whirlingblades',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Whiring_Blades.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Whiring_Blades.png',
    loop: false,
    scale: 3 * scale,
  },
  spectralprojection: {
    name: 'spectralprojection',
    spritesheetJson:
      '/assets/spritesheets/phantom_duelist/Spectral_Projection.json',
    spritesheetImage:
      '/assets/spritesheets/phantom_duelist/Spectral_Projection.png',
    loop: false,
    scale: 1 * scale,
  },
  phantomarmor: {
    name: 'phantomarmor',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Phantom_Armor.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Phantom_Armor.png',
    loop: false,
    scale: 1 * scale,
  },
  dead: {
    name: 'dead',
    spritesheetJson: '/assets/spritesheets/phantom_duelist/Duelist_Death.json',
    spritesheetImage: '/assets/spritesheets/phantom_duelist/Duelist_Death.png',
    loop: false,
    scale: 1 * scale,
  },
};

export const AnimatedPhantomDuelist = memo(
  ({ entity }: { entity: IEntity }) => {
    const { animation, image, isPlaying, isLoading, error, scale } =
      useEntityAnimations({
        entityId: entity.id,
        animations: animations,
        defaultAnimation: 'idle',
        defaultScale: 1.5,
      });

    if (isLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center rounded-md border-2 border-indigo-700 bg-indigo-500 text-xs font-bold text-white shadow-lg">
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
  }
);

AnimatedPhantomDuelist.displayName = 'AnimatedPhantomDuelist';
