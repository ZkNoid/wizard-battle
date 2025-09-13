import React from 'react';
import type { IEntity } from '../types/IEntity';
import { AnimatedCanvas } from '../components/AnimatedCanvas';
import { useAnimatedEntity } from '../hooks/useAnimatedEntity';

interface AnimatedWizardProps {
  entity: IEntity;
}

export function AnimatedWizard({ entity }: AnimatedWizardProps) {
  const {
    animation,
    image,
    isPlaying,
    currentAnimationName,
    isLoading,
    error,
  } = useAnimatedEntity({
    entityId: entity.id,
    spritesheetJson: '/assets/spritesheets/Sourcer_Idle.json',
    spritesheetImage: '/assets/spritesheets/Sourcer_Idle.png',
    defaultAnimation: 'idle',
    defaultLoop: true,
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
      onAnimationComplete={() => {
        console.log(
          `Animation ${currentAnimationName} completed for entity ${entity.id}`
        );
      }}
    />
  );
}
