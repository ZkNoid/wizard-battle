import React from 'react';
import type { IEntity } from '../types/IEntity';
import { RedSquare } from '../entities/RedSquare';
import { BlueSquare } from '../entities/BlueSquare';
import { AnimatedWizard } from '../entities/AnimatedWizard';
import { AnimatedArcher } from '../entities/AnimatedArcher';
import { SpectralWizard } from '../entities/SpectralWizard';
import { Decoy } from '../entities/Decoy';
import { EntityType } from '../types/IEntity';

interface EntityOverlayProps {
  entities: IEntity[];
  gridWidth: number; // grid width in tiles (usually 8)
  gridHeight: number; // grid height in tiles (usually 8)
  className?: string;
}

/**
 * Component to display entities on top of the tilemap
 */
export function EntityOverlay({
  entities,
  gridWidth,
  gridHeight,
  className = '',
}: EntityOverlayProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
    >
      {entities.map((entity) => {
        // Check if the position is valid
        if (
          entity.tilemapPosition.x < 0 ||
          entity.tilemapPosition.x >= gridWidth ||
          entity.tilemapPosition.y < 0 ||
          entity.tilemapPosition.y >= gridHeight
        ) {
          return null;
        }

        // Calculate the position as percentage of grid
        const leftPosition = (entity.tilemapPosition.x / gridWidth) * 100;
        const topPosition = (entity.tilemapPosition.y / gridHeight) * 100;
        const entityWidth = (1 / gridWidth) * 100; // each entity occupies 1/8 = 12.5% width
        const entityHeight = (1 / gridHeight) * 100; // each entity occupies 1/8 = 12.5% height

        return (
          <div
            key={entity.id}
            className="absolute transition-[left,top] duration-200 ease-in-out"
            style={{
              left: `${leftPosition}%`,
              top: `${topPosition}%`,
              width: `${entityWidth}%`,
              height: `${entityHeight}%`,
              willChange: 'left, top',
            }}
          >
            {entity.type === EntityType.RED_SQUARE && (
              <RedSquare entity={entity} />
            )}
            {entity.type === EntityType.BLUE_SQUARE && (
              <BlueSquare entity={entity} />
            )}
            {entity.type === EntityType.WIZARD && (
              <AnimatedWizard entity={entity} />
            )}
            {entity.type === EntityType.ARCHER && (
              <AnimatedArcher entity={entity} />
            )}
            {entity.type === EntityType.SPECTRAL_WIZARD && (
              <SpectralWizard entity={entity} />
            )}
            {entity.type === EntityType.DECOY && <Decoy entity={entity} />}
          </div>
        );
      })}
    </div>
  );
}
