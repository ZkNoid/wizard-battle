'use client';

export const dynamic = 'force-dynamic';

import { useCallback } from 'react';
import { useMinaAppkit } from 'mina-appkit';

import Game from '@/components/Game';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { useInGameStore } from '@/lib/store/inGameStore';
import {
  Tilemap,
  EntityOverlay,
  EffectOverlay,
} from '@/engine';
import { GamePhase } from '../../../../common/types/gameplay.types';
import Header from '@/components/Header';
import Modals from '@/components/Header/Modals';

import {
  GRID_WIDTH,
  GRID_HEIGHT,
  TILE_SIZE,
  SPECTRAL_ENTITY_ID,
  DECOY_ENTITY_ID,
  OPPONENT_SPECTRAL_ENTITY_ID,
  SPELL_HIGHLIGHT_COLOR,
} from './constants';
import {
  useEffectChecks,
  useTileHighlighting,
  useSpellActions,
  useEntityManagement,
  useGameLifecycle,
} from './hooks';

export default function GamePage() {
  // External hooks
  const { address } = useMinaAppkit();

  // Store hooks
  const { stater, opponentState, gamePhaseManager, setActionSend, actionSend } =
    useUserInformationStore();
  const { pickedSpellId, setPickedSpellId } = useInGameStore();

  // Effect checking
  const {
    staterRef,
    opponentStateRef,
    hasSpectralProjectionEffect,
    hasOpponentSpectralProjectionEffect,
    getDecoyEffect,
  } = useEffectChecks({ stater, opponentState });

  // Tile highlighting
  const {
    highlightedAllyTiles,
    highlightedEnemyTiles,
    handleAllyTileMouseEnter,
    handleEnemyTileMouseEnter,
    handleAllyMouseLeave,
    handleEnemyMouseLeave,
    isValidCastPosition,
  } = useTileHighlighting({
    stater,
    pickedSpellId,
    canPlayerAct: gamePhaseManager?.currentPhase === GamePhase.SPELL_CASTING,
  });

  // Spell actions
  const {
    actionInfo,
    preparedActions,
    resetActionState,
    syncState,
    handleTilemapClick,
    handleTilemapClickEnemy,
  } = useSpellActions({
    stater,
    opponentState,
    staterRef,
    opponentStateRef,
    gamePhaseManager,
    setActionSend,
    setPickedSpellId,
    isValidCastPosition,
  });

  // Game lifecycle
  const { canPlayerAct } = useGameLifecycle({
    address,
    gamePhaseManager,
    setActionSend,
    resetActionState,
    syncState,
  });

  // Entity management
  const { entities } = useEntityManagement({
    stater,
    opponentState,
    hasSpectralProjectionEffect,
    hasOpponentSpectralProjectionEffect,
    getDecoyEffect,
  });

  // Tilemap click handlers with spell ID
  const handleAllyMapClick = useCallback(
    (index: number) => handleTilemapClick(index, pickedSpellId),
    [handleTilemapClick, pickedSpellId]
  );

  const handleEnemyMapClick = useCallback(
    (index: number) => handleTilemapClickEnemy(index, pickedSpellId),
    [handleTilemapClickEnemy, pickedSpellId]
  );

  return (
    <main className="relative flex h-screen w-full overflow-hidden">
      <Header />
      <Game actionInfo={actionInfo} preparedActions={preparedActions}>
        {/* Left half - Ally map */}
        <div className="relative">
          <Tilemap
            width={GRID_WIDTH}
            height={GRID_HEIGHT}
            tileSize={TILE_SIZE}
            tilemap={stater?.state?.map.map((tile) => +tile)}
            onTileClick={handleAllyMapClick}
            onTileMouseEnter={handleAllyTileMouseEnter}
            onMouseLeave={handleAllyMouseLeave}
            highlightedTiles={highlightedAllyTiles}
          />
          <EntityOverlay
            entities={entities.filter(
              (entity) =>
                entity.id !== 'enemy' &&
                entity.id !== SPECTRAL_ENTITY_ID &&
                entity.id !== DECOY_ENTITY_ID
            )}
            gridWidth={GRID_WIDTH}
            gridHeight={GRID_HEIGHT}
          />
          <EffectOverlay
            overlayId="user"
            gridWidth={GRID_WIDTH}
            gridHeight={GRID_HEIGHT}
          />
        </div>

        {/* Right half - Enemy map */}
        <div className="relative">
          {actionSend && (
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform text-center text-lg font-bold text-white">
              Waiting for opponent turn
            </div>
          )}
          <Tilemap
            width={GRID_WIDTH}
            height={GRID_HEIGHT}
            tileSize={TILE_SIZE}
            tilemap={opponentState?.map.map((tile) => +tile)}
            onTileClick={handleEnemyMapClick}
            onTileMouseEnter={handleEnemyTileMouseEnter}
            onMouseLeave={handleEnemyMouseLeave}
            highlightedTiles={highlightedEnemyTiles}
            defaultHighlight={{ color: SPELL_HIGHLIGHT_COLOR }}
          />
          <EntityOverlay
            entities={entities.filter((entity) => {
              if (entity.id === 'user') return false;
              if (entity.id === OPPONENT_SPECTRAL_ENTITY_ID) return false;
              if (entity.id === 'enemy') {
                return (
                  opponentState?.playerStats?.position?.isSome &&
                  +opponentState.playerStats.position.isSome === 1
                );
              }
              return true;
            })}
            gridWidth={GRID_WIDTH}
            gridHeight={GRID_HEIGHT}
          />
          <EffectOverlay
            overlayId="enemy"
            gridWidth={GRID_WIDTH}
            gridHeight={GRID_HEIGHT}
          />
        </div>
      </Game>
      <Modals />
    </main>
  );
}
