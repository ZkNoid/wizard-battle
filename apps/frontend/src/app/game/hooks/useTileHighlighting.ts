import { useState, useCallback, useEffect } from 'react';
import type { Field } from 'o1js';
import { allSpells } from '../../../../../common/stater/spells';
import type { Stater } from '../../../../../common/stater/stater';
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  MOVEMENT_HIGHLIGHT_COLOR,
  SPELL_HIGHLIGHT_COLOR,
} from '../constants';
import { indexToCoordinates, coordinatesToIndex, isInBounds } from '../utils';
import type { TileHighlight } from '../types';

interface UseTileHighlightingProps {
  stater: Stater | null;
  pickedSpellId: Field | null;
  canPlayerAct: boolean;
}

export function useTileHighlighting({
  stater,
  pickedSpellId,
  canPlayerAct,
}: UseTileHighlightingProps) {
  const [highlightedAllyTiles, setHighlightedAllyTiles] = useState<
    Map<number, TileHighlight>
  >(new Map());
  const [highlightedEnemyTiles, setHighlightedEnemyTiles] = useState<number[]>(
    []
  );

  // Clear highlights when spell selection changes
  useEffect(() => {
    if (!pickedSpellId) {
      setHighlightedAllyTiles(new Map());
      setHighlightedEnemyTiles([]);
    }
  }, [pickedSpellId]);

  // Get valid cast positions for a spell (uses castedArea if defined)
  const getValidCastPositions = useCallback(
    (spell: (typeof allSpells)[0]) => {
      if (!spell.castedArea || !stater?.state?.playerStats) {
        return null; // No restriction - can cast anywhere
      }
      const userX = +stater.state.playerStats.position.value.x;
      const userY = +stater.state.playerStats.position.value.y;
      return spell.castedArea(userX, userY);
    },
    [stater?.state?.playerStats]
  );

  // Check if a position is valid for casting
  const isValidCastPosition = useCallback(
    (spell: (typeof allSpells)[0], x: number, y: number) => {
      const validPositions = getValidCastPositions(spell);
      if (!validPositions) return true; // No restriction
      return validPositions.some((pos) => pos.x === x && pos.y === y);
    },
    [getValidCastPositions]
  );

  // Convert positions to indices, filtering out-of-bounds
  const positionsToIndices = useCallback(
    (positions: { x: number; y: number }[]) => {
      return positions
        .filter((pos) => isInBounds(pos.x, pos.y, GRID_WIDTH, GRID_HEIGHT))
        .map((pos) => coordinatesToIndex(pos.x, pos.y));
    },
    []
  );

  // Handle spell highlighting for ally or enemy map
  const handleSpellHighlighting = useCallback(
    (spell: (typeof allSpells)[0], x: number, y: number, isEnemy: boolean) => {
      // Check if spell target matches the map being hovered
      const isValidTarget =
        (spell.target === 'enemy' && isEnemy) ||
        (spell.target === 'ally' && !isEnemy);

      if (!isValidTarget) {
        if (isEnemy) {
          setHighlightedEnemyTiles([]);
        } else {
          setHighlightedAllyTiles(new Map());
        }
        return;
      }

      // Get valid cast positions (castedArea restriction)
      const validCastPositions = getValidCastPositions(spell);

      // If spell has castedArea, show those positions as red overlay
      // and only show affectedArea if hovering over a valid cast position
      if (validCastPositions) {
        const validCastIndices = positionsToIndices(validCastPositions);
        const isHoveredValid = validCastPositions.some(
          (pos) => pos.x === x && pos.y === y
        );

        if (isEnemy) {
          if (isHoveredValid && spell.affectedArea) {
            const affectedPositions = spell.affectedArea(x, y);
            setHighlightedEnemyTiles(positionsToIndices(affectedPositions));
          } else {
            setHighlightedEnemyTiles(validCastIndices);
          }
        } else {
          const highlightMap = new Map<number, TileHighlight>();
          if (isHoveredValid && spell.affectedArea) {
            const affectedPositions = spell.affectedArea(x, y);
            positionsToIndices(affectedPositions).forEach((idx) => {
              highlightMap.set(idx, { color: SPELL_HIGHLIGHT_COLOR });
            });
          } else {
            validCastIndices.forEach((idx) => {
              highlightMap.set(idx, { color: SPELL_HIGHLIGHT_COLOR });
            });
          }
          setHighlightedAllyTiles(highlightMap);
        }
        return;
      }

      // No castedArea restriction - show affectedArea on hover
      if (!spell.affectedArea) {
        if (isEnemy) {
          setHighlightedEnemyTiles([]);
        } else {
          setHighlightedAllyTiles(new Map());
        }
        return;
      }

      const affectedPositions = spell.affectedArea(x, y);
      const indices = positionsToIndices(affectedPositions);

      if (isEnemy) {
        setHighlightedEnemyTiles(indices);
      } else {
        const highlightMap = new Map<number, TileHighlight>();
        indices.forEach((idx) => {
          highlightMap.set(idx, { color: SPELL_HIGHLIGHT_COLOR });
        });
        setHighlightedAllyTiles(highlightMap);
      }
    },
    [getValidCastPositions, positionsToIndices]
  );

  // Show movement range when no spell is picked
  const showMovementRange = useCallback(() => {
    if (!stater?.state?.playerStats) return;

    const userX = +stater.state.playerStats.position.value.x;
    const userY = +stater.state.playerStats.position.value.y;
    const speed = +stater.state.playerStats.speed;

    const movementTiles = new Map<number, TileHighlight>();
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const distance = Math.abs(userX - x) + Math.abs(userY - y);
        if (distance <= speed) {
          movementTiles.set(coordinatesToIndex(x, y), {
            color: MOVEMENT_HIGHLIGHT_COLOR,
          });
        }
      }
    }
    setHighlightedAllyTiles(movementTiles);
  }, [stater?.state?.playerStats]);

  // Tile hover handler for spell affected area highlighting
  const handleTileMouseEnter = useCallback(
    (index: number, isEnemy: boolean) => {
      // Only show highlights when player can act
      if (!canPlayerAct) {
        setHighlightedAllyTiles(new Map());
        setHighlightedEnemyTiles([]);
        return;
      }

      if (!pickedSpellId) {
        // Show movement range on ally map when no spell is picked
        if (!isEnemy) {
          showMovementRange();
        } else {
          setHighlightedEnemyTiles([]);
        }
        return;
      }

      const spell = allSpells.find(
        (s) => s.id.toString() === pickedSpellId.toString()
      );

      if (!spell) {
        if (isEnemy) {
          setHighlightedEnemyTiles([]);
        } else {
          setHighlightedAllyTiles(new Map());
        }
        return;
      }

      const { x, y } = indexToCoordinates(index);
      handleSpellHighlighting(spell, x, y, isEnemy);
    },
    [canPlayerAct, pickedSpellId, showMovementRange, handleSpellHighlighting]
  );

  const handleAllyTileMouseEnter = useCallback(
    (index: number) => {
      handleTileMouseEnter(index, false);
    },
    [handleTileMouseEnter]
  );

  const handleEnemyTileMouseEnter = useCallback(
    (index: number) => {
      handleTileMouseEnter(index, true);
    },
    [handleTileMouseEnter]
  );

  const handleAllyMouseLeave = useCallback(() => {
    setHighlightedAllyTiles(new Map());
  }, []);

  const handleEnemyMouseLeave = useCallback(() => {
    setHighlightedEnemyTiles([]);
  }, []);

  return {
    highlightedAllyTiles,
    highlightedEnemyTiles,
    handleAllyTileMouseEnter,
    handleEnemyTileMouseEnter,
    handleAllyMouseLeave,
    handleEnemyMouseLeave,
    isValidCastPosition,
  };
}

