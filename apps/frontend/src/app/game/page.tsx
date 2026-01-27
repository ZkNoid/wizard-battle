'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMinaAppkit } from 'mina-appkit';
import { Int64, CircuitString } from 'o1js';

import Game from '@/components/Game';
import { api } from '@/trpc/react';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { useInGameStore } from '@/lib/store/inGameStore';
import { useEngineStore } from '@/lib/store/engineStore';
import { allSpells, SpellId } from '../../../../common/stater/spells';
import { Position } from '../../../../common/stater/structs';
import type {
  IUserAction,
  IUserActions,
} from '../../../../common/types/gameplay.types';
import { GamePhase } from '../../../../common/types/gameplay.types';
import { EventBus } from '@/game/EventBus';
import type { GamePhaseManager } from '@/game/GamePhaseManager';
import {
  Tilemap,
  EntityOverlay,
  EffectOverlay,
  gameEventEmitter,
  EntityType,
} from '@/engine';
import { WizardId } from '../../../../common/wizards';

// Constants
const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;
const TILE_SIZE = 60;
const DEFAULT_USER_POSITION = { x: 3, y: 3 };
const DEFAULT_ENEMY_POSITION = { x: 3, y: 3 };
const SCENE_READY_DELAY = 100;
const SPECTRAL_PROJECTION_EFFECT_ID = CircuitString.fromString('SpectralProjectionReturn').hash();
const SPECTRAL_ENTITY_ID = 'spectral-user';
const OPPONENT_SPECTRAL_ENTITY_ID = 'spectral-enemy';

// Types
type MapType = 'ally' | 'enemy';

export default function GamePage() {
  // Hooks
  const router = useRouter();
  const { address } = useMinaAppkit();
  const [canPlayerAct, setCanPlayerAct] = useState<boolean>(false);
  const [actionInfo, setActionInfo] = useState<{
    movementDone: boolean;
    spellCastDone: boolean;
  }>({
    movementDone: false,
    spellCastDone: false,
  });
  const [preparedActions, setPreparedActions] = useState<IUserAction[]>([]);
  const [highlightedAllyTiles, setHighlightedAllyTiles] = useState<
    Map<number, { color: string }>
  >(new Map());
  const [highlightedEnemyTiles, setHighlightedEnemyTiles] = useState<number[]>(
    []
  );

  // Store hooks
  const { stater, opponentState, gamePhaseManager, setActionSend, actionSend } =
    useUserInformationStore();
  const { pickedSpellId, setPickedSpellId } = useInGameStore();
  const { addEntity, getAllEntities, initMovementHandler, clearEntities, removeEntity, getEntity } =
    useEngineStore();

  // Refs
  const isInitialized = useRef<boolean>(false);
  const staterRef = useRef(stater);
  const opponentStateRef = useRef(opponentState);
  const gamePhaseManagerRef = useRef<GamePhaseManager | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Derived state
  const entities = getAllEntities();

  // Check if spectral projection effect is active
  const hasSpectralProjectionEffect = useCallback(() => {
    if (!staterRef.current?.state?.onEndEffects) return false;
    
    return staterRef.current.state.onEndEffects.some(
      (effect) => effect.effectId.equals(SPECTRAL_PROJECTION_EFFECT_ID).toBoolean()
    );
  }, []);

  // Check if opponent has spectral projection effect
  const hasOpponentSpectralProjectionEffect = useCallback(() => {
    if (!opponentStateRef.current?.onEndEffects) return false;
    
    return opponentStateRef.current.onEndEffects.some(
      (effect) => effect.effectId.equals(SPECTRAL_PROJECTION_EFFECT_ID).toBoolean()
    );
  }, []);

  const syncState = () => {
    // Sync player state

    if (staterRef.current) {
      const newXAlly = +staterRef.current.state.playerStats.position.value.x;
      const newYAlly = +staterRef.current.state.playerStats.position.value.y;
      gameEventEmitter.move('user', newXAlly, newYAlly);
      
      // Also sync spectral projection position if it exists
      gameEventEmitter.move(SPECTRAL_ENTITY_ID, newXAlly, newYAlly);
    }

    // Sync opponent state
    if (opponentStateRef.current) {
      const newXEnemy = +opponentStateRef.current.playerStats.position.value.x;
      const newYEnemy = +opponentStateRef.current.playerStats.position.value.y;
      gameEventEmitter.move('enemy', newXEnemy, newYEnemy);
      
      // Also sync opponent spectral projection position if it exists
      gameEventEmitter.move(OPPONENT_SPECTRAL_ENTITY_ID, newXEnemy, newYEnemy);
    }
  };

  // Utility functions
  const indexToCoordinates = useCallback((index: number) => {
    const x = index % GRID_WIDTH;
    const y = Math.floor(index / GRID_WIDTH);
    return { x, y };
  }, []);

  const coordinatesToIndex = useCallback((x: number, y: number) => {
    return y * GRID_WIDTH + x;
  }, []);

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
        if (!isEnemy && stater?.state?.playerStats) {
          const userX = +stater.state.playerStats.position.value.x;
          const userY = +stater.state.playerStats.position.value.y;
          const speed = +stater.state.playerStats.speed;

          // Calculate tiles within movement range (Manhattan distance)
          const movementTiles = new Map<number, { color: string }>();
          for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
              const distance = Math.abs(userX - x) + Math.abs(userY - y);
              if (distance <= speed) {
                movementTiles.set(coordinatesToIndex(x, y), {
                  color: 'rgba(100, 255, 100, 0.5)',
                });
              }
            }
          }
          setHighlightedAllyTiles(movementTiles);
        } else {
          // Clear highlights on enemy map when no spell is picked
          if (isEnemy) {
            setHighlightedEnemyTiles([]);
          } else {
            setHighlightedAllyTiles(new Map());
          }
        }
        return;
      }

      const spell = allSpells.find(
        (s) => s.id.toString() === pickedSpellId.toString()
      );

      if (!spell || !spell.affectedArea) {
        if (isEnemy) {
          setHighlightedEnemyTiles([]);
        } else {
          setHighlightedAllyTiles(new Map());
        }
        return;
      }

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

      const { x, y } = indexToCoordinates(index);
      const affectedPositions = spell.affectedArea(x, y);

      // Convert positions to indices, filtering out-of-bounds
      const indices = affectedPositions
        .filter(
          (pos) =>
            pos.x >= 0 &&
            pos.x < GRID_WIDTH &&
            pos.y >= 0 &&
            pos.y < GRID_HEIGHT
        )
        .map((pos) => coordinatesToIndex(pos.x, pos.y));

      if (isEnemy) {
        setHighlightedEnemyTiles(indices);
      } else {
        const highlightMap = new Map<number, { color: string }>();
        indices.forEach((idx) => {
          highlightMap.set(idx, { color: 'rgba(255, 100, 100, 0.5)' });
        });
        setHighlightedAllyTiles(highlightMap);
      }
    },
    [canPlayerAct, pickedSpellId, indexToCoordinates, coordinatesToIndex, stater]
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

  // Spell casting logic
  const createUserAction = useCallback(
    (
      spellId: string,
      x: number,
      y: number,
      isEnemy: boolean
    ): IUserAction | null => {
      const spell = allSpells.find((s) => s.id.toString() === spellId);
      if (!spell) {
        console.log('Spell not found');
        return null;
      }

      const cast = spell.cast(
        stater?.state!,
        stater?.state?.playerId!,
        opponentState!.playerId,
        new Position({ x: Int64.from(x), y: Int64.from(y) })
      );

      const targetPlayerId = isEnemy
        ? opponentState?.playerId?.toString()
        : stater?.state?.playerId?.toString();

      if (!targetPlayerId) {
        console.log(`${isEnemy ? 'Opponent' : 'Stater'} state not found`);
        return null;
      }

      return {
        playerId: targetPlayerId,
        spellId: spell.id.toString(),
        caster: stater?.state?.playerId?.toString() ?? '',
        spellCastInfo: JSON.stringify(
          spell.modifierData.toJSON(cast.additionalData)
        ),
      };
    },
    [stater?.state, opponentState]
  );

  const submitSpellAction = useCallback(
    (
      userAction: IUserAction | null,
      updatedActionInfo: { movementDone: boolean; spellCastDone: boolean },
      companionAction?: IUserAction | null
    ) => {
      let actions = preparedActions;
      if (userAction) {
        actions = [...actions, userAction];
      }
      if (companionAction) {
        actions = [...actions, companionAction];
      }

      if (!updatedActionInfo.movementDone || !updatedActionInfo.spellCastDone) {
        console.log('Adding to prepared actions');
        if (userAction || companionAction) {
          setPreparedActions(actions);
        }
        return;
      }

      console.log('Submitting actions');

      const userActions: IUserActions = {
        actions,
        signature: '',
      };

      gamePhaseManager?.submitPlayerActions(userActions);
      setActionSend(true);
    },
    [gamePhaseManager, setActionSend, preparedActions]
  );

  // Map click handlers
  const handleMapClick = useCallback(
    (x: number, y: number, isEnemy: boolean) => {
      console.log(`${isEnemy ? 'Enemy' : 'Ally'} map clicked:`, x, y);

      let spellId = pickedSpellId;
      let updatedActionInfo = { ...actionInfo };

      // Default to move spell if no spell is picked and clicking on ally map
      if (!pickedSpellId && !isEnemy) {
        spellId = SpellId['Move'] ?? null;
        if (actionInfo.movementDone) {
          console.log('Movement already done');
          return;
        }

        const userX = +stater?.state?.playerStats.position.value.x!;
        const userY = +stater?.state?.playerStats.position.value.y!;
        const speed = +stater?.state?.playerStats.speed!;

        if (Math.abs(userX - x) + Math.abs(userY - y) > speed) {
          console.log('Location is too far away. Speed:', speed);
          return;
        }

        updatedActionInfo = {
          ...actionInfo,
          movementDone: true,
        };
      } else {
        if (actionInfo.spellCastDone) {
          console.log('Spell cast already done');
          return;
        }
        updatedActionInfo = {
          ...actionInfo,
          spellCastDone: true,
        };
      }

      if (!spellId) {
        console.log('No spell picked');
        return;
      }

      // Play animation
      const spell = allSpells.find(
        (s) => s.id.toString() === spellId.toString()
      );

      if (!spell) {
        console.log('Spell not found');
        return;
      }

      // Check if target is correct
      if (spell.target === 'enemy' && isEnemy) {
        console.log('Target is correct');
      } else if (spell.target === 'ally' && !isEnemy) {
        console.log('Target is correct');
      } else {
        console.log('Target is incorrect');
        return;
      }

      let userAction = createUserAction(spellId.toString(), x, y, isEnemy);
      if (!userAction) return;

      // Handle companion spell if present
      let companionAction: IUserAction | null = null;
      if (spell.companionSpellId) {
        const companionSpell = allSpells.find(
          (s) => s.id.toString() === spell.companionSpellId!.toString()
        );
        if (companionSpell) {
          console.log('Creating companion spell action:', companionSpell.name);
          // Companion spell targets self (ally) with the same position
          companionAction = createUserAction(
            companionSpell.id.toString(),
            x,
            y,
            false // companion spell targets ally (self)
          );
        }
      }

      setActionInfo(updatedActionInfo);

      console.log(
        'userAction.playerId:',
        userAction.playerId,
        stater?.state?.playerId?.toString()
      );
      if (userAction.playerId === stater?.state?.playerId?.toString()) {
        console.log('Apply actions locally');
        stater.applyActionsLocally(
          { actions: [userAction], signature: '' },
          opponentState!
        );
        syncState();
        if (spell.globalStatus !== 'global') {
          userAction = null;
        }
      }

      // Apply companion spell locally if it targets self
      if (companionAction && companionAction.playerId === stater?.state?.playerId?.toString()) {
        console.log('Apply companion spell locally');
        stater.applyActionsLocally(
          { actions: [companionAction], signature: '' },
          opponentState!
        );
        syncState();
        const companionSpell = allSpells.find(
          (s) => s.id.toString() === spell.companionSpellId!.toString()
        );
        if (companionSpell?.globalStatus !== 'global') {
          companionAction = null;
        }
      }

      console.log('userAction:', userAction);
      console.log('companionAction:', companionAction);

      // Submit both main and companion actions
      submitSpellAction(userAction, updatedActionInfo, companionAction);

      if (spell) {
        gameEventEmitter.playAnimationOneTime(
          'user',
          spell.name.toLowerCase(),
          stater?.state.wizardId.toString() === WizardId.ARCHER.toString()
            ? 4.6
            : 3.6
        );
      }

      // Reset picked spell
      setPickedSpellId(null);
    },
    [
      pickedSpellId,
      createUserAction,
      submitSpellAction,
      actionInfo,
      setPickedSpellId,
    ]
  );

  const handleTilemapClick = useCallback(
    (index: number) => {
      const { x, y } = indexToCoordinates(index);
      handleMapClick(x, y, false);
    },
    [indexToCoordinates, handleMapClick]
  );

  const handleTilemapClickEnemy = useCallback(
    (index: number) => {
      const { x, y } = indexToCoordinates(index);
      handleMapClick(x, y, true);
    },
    [indexToCoordinates, handleMapClick]
  );

  // Game state management
  const onNewTurnHook = useCallback(() => {
    if (!staterRef.current) {
      console.log('Stater not found');
      return;
    }

    setActionSend(false);
    setActionInfo({ movementDone: false, spellCastDone: false });
    setPreparedActions([]);

    const { state } = staterRef.current;
    console.log('staterRef.current.state:', state);

    syncState();
  }, [setActionSend]);

  // Effects

  useEffect(() => {
    if (gamePhaseManager) {
      // Wait for all game systems to be ready
      const timer = setTimeout(() => {
        console.log('🎮 Game systems ready, confirming player joined');
        gamePhaseManager.onGameLoaded();
      }, 2000); // 2 second delay to ensure everything is loaded

      return () => clearTimeout(timer);
    }
  }, [gamePhaseManager]);

  useEffect(() => {
    if (!address) {
      router.replace('/');
    }
  }, [address, router]);

  useEffect(() => {
    if (gamePhaseManager?.currentPhase === GamePhase.SPELL_CASTING) {
      setCanPlayerAct(true);
    } else {
      setCanPlayerAct(false);
    }
  }, [gamePhaseManager?.currentPhase]);

  // Clear highlights when spell selection changes
  useEffect(() => {
    if (!pickedSpellId) {
      setHighlightedAllyTiles(new Map());
      setHighlightedEnemyTiles([]);
    }
  }, [pickedSpellId]);

  useEffect(() => {
    staterRef.current = stater;
  }, [stater]);

  useEffect(() => {
    opponentStateRef.current = opponentState;
  }, [opponentState]);

  // Manage spectral projection entity based on effect presence
  useEffect(() => {
    const hasEffect = hasSpectralProjectionEffect();
    const spectralEntity = getEntity(SPECTRAL_ENTITY_ID);
    
    if (hasEffect && !spectralEntity) {
      // Effect is active but entity doesn't exist - create it
      const userPosition = stater?.state?.playerStats?.position?.value;
      const spectral = {
        id: SPECTRAL_ENTITY_ID,
        type: EntityType.SPECTRAL_WIZARD,
        tilemapPosition: userPosition 
          ? { x: +userPosition.x, y: +userPosition.y }
          : DEFAULT_USER_POSITION,
        mirrorEntityId: 'user', // Mirror animations from the user entity
      };
      addEntity(spectral);
      console.log('👻 Created spectral projection entity');
    } else if (!hasEffect && spectralEntity) {
      // Effect is not active but entity exists - remove it
      removeEntity(SPECTRAL_ENTITY_ID);
      console.log('👻 Removed spectral projection entity');
    }
  }, [stater?.state?.onEndEffects, hasSpectralProjectionEffect, getEntity, addEntity, removeEntity, stater?.state?.playerStats?.position?.value]);

  // Manage opponent spectral projection entity based on effect presence and visibility
  useEffect(() => {
    const hasEffect = hasOpponentSpectralProjectionEffect();
    const spectralEntity = getEntity(OPPONENT_SPECTRAL_ENTITY_ID);
    const isOpponentVisible = opponentState?.playerStats?.position?.isSome && +opponentState.playerStats.position.isSome === 1;
    
    if (hasEffect && !spectralEntity && isOpponentVisible) {
      // Effect is active, opponent is visible, but entity doesn't exist - create it
      const opponentPosition = opponentState?.playerStats?.position?.value;
      const spectral = {
        id: OPPONENT_SPECTRAL_ENTITY_ID,
        type: EntityType.SPECTRAL_WIZARD,
        tilemapPosition: opponentPosition 
          ? { x: +opponentPosition.x, y: +opponentPosition.y }
          : DEFAULT_ENEMY_POSITION,
        mirrorEntityId: 'enemy', // Mirror animations from the enemy entity
      };
      addEntity(spectral);
      console.log('👻 Created opponent spectral projection entity');
    } else if (spectralEntity && (!hasEffect || !isOpponentVisible)) {
      // Entity exists but effect is not active OR opponent is not visible - remove it
      removeEntity(OPPONENT_SPECTRAL_ENTITY_ID);
      console.log('👻 Removed opponent spectral projection entity (effect:', hasEffect, ', visible:', isOpponentVisible, ')');
    }
  }, [opponentState?.onEndEffects, hasOpponentSpectralProjectionEffect, getEntity, addEntity, removeEntity, opponentState?.playerStats?.position?.value, opponentState?.playerStats?.position?.isSome]);

  useEffect(() => {
    const cleanupMovement = initMovementHandler();
    if (!isInitialized.current) {
      const user = {
        id: 'user',
        type:
          stater?.state.wizardId.toString() === WizardId.MAGE.toString()
            ? EntityType.WIZARD
            : stater?.state.wizardId.toString() === WizardId.ARCHER.toString()
              ? EntityType.ARCHER
              : EntityType.WIZARD,
        tilemapPosition: DEFAULT_USER_POSITION,
      };

      addEntity(user);

      const enemy = {
        id: 'enemy',
        type:
          opponentState?.wizardId.toString() === WizardId.MAGE.toString()
            ? EntityType.WIZARD
            : opponentState?.wizardId.toString() === WizardId.ARCHER.toString()
              ? EntityType.ARCHER
              : EntityType.WIZARD,
        tilemapPosition: DEFAULT_ENEMY_POSITION,
      };

      addEntity(enemy);

      isInitialized.current = true;
    }

    return () => {
      cleanupMovement();
      clearEntities();
      isInitialized.current = false;
    };
  }, [initMovementHandler, addEntity, clearEntities]);

  // Track gamePhaseManager changes and handle cleanup of old instances
  useEffect(() => {
    if (gamePhaseManager) {
      // If there's a different manager in the ref, clean up the old one
      if (
        gamePhaseManagerRef.current &&
        gamePhaseManagerRef.current !== gamePhaseManager
      ) {
        console.log('🧹 Cleaning up OLD GamePhaseManager instance');
        gamePhaseManagerRef.current.cleanup();
      }
      // Store the current manager
      gamePhaseManagerRef.current = gamePhaseManager;
      console.log('📌 Stored GamePhaseManager reference');
    }
  }, [gamePhaseManager]);

  useEffect(() => {
    gamePhaseManager?.setOnNewTurnHook(onNewTurnHook);
  }, [gamePhaseManager, onNewTurnHook]);

  // Cleanup game phase manager ONLY on final unmount (not during Strict Mode double-mount)
  useEffect(() => {
    isMountedRef.current = true;
    console.log('✅ GamePage mounted');

    return () => {
      console.log('⏳ GamePage cleanup triggered');

      // Set flag immediately to prevent race conditions
      isMountedRef.current = false;

      // Delay cleanup to see if component remounts (Strict Mode behavior)
      // In Strict Mode: component unmounts then immediately remounts
      // In real unmount: component stays unmounted
      setTimeout(() => {
        // After delay, check if still unmounted (real unmount vs Strict Mode remount)
        if (!isMountedRef.current && gamePhaseManagerRef.current) {
          console.log(
            '🛑 REAL unmount confirmed - cleaning up GamePhaseManager'
          );
          gamePhaseManagerRef.current.cleanup();
          gamePhaseManagerRef.current = null;
        } else {
          console.log(
            '🔄 Component remounted (Strict Mode) - skipping cleanup'
          );
        }
      }, 0);

      // Note: We can't clear this timeout on remount since the cleanup has already run
      // But that's OK - the isMountedRef.current check handles it
    };
  }, []);

  useEffect(() => {
    const handleSceneReady = (
      scene_instance: Phaser.Scene,
      gameInstance: string
    ) => {
      console.log('!!current-scene-ready', scene_instance, gameInstance);
      setTimeout(() => {
        onNewTurnHook();
      }, SCENE_READY_DELAY);
    };

    EventBus.on('current-scene-ready', handleSceneReady);
    onNewTurnHook(); // Fallback

    return () => {
      EventBus.removeListener('current-scene-ready', handleSceneReady);
    };
  }, [onNewTurnHook]);

  return (
    <Game actionInfo={actionInfo}>
      {/* Left half - Ally map */}
      <div className="relative">
        <Tilemap
          width={GRID_WIDTH}
          height={GRID_HEIGHT}
          tileSize={TILE_SIZE}
          tilemap={stater?.state?.map.map((tile) => +tile)}
          onTileClick={handleTilemapClick}
          onTileMouseEnter={handleAllyTileMouseEnter}
          onMouseLeave={handleAllyMouseLeave}
          highlightedTiles={highlightedAllyTiles}
        />
        <EntityOverlay
          entities={entities.filter((entity) => 
            entity.id !== 'enemy' && 
            entity.id !== SPECTRAL_ENTITY_ID
            // Show opponent's spectral projection on ally map (OPPONENT_SPECTRAL_ENTITY_ID)
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
          onTileClick={handleTilemapClickEnemy}
          onTileMouseEnter={handleEnemyTileMouseEnter}
          onMouseLeave={handleEnemyMouseLeave}
          highlightedTiles={highlightedEnemyTiles}
          defaultHighlight={{ color: 'rgba(255, 100, 100, 0.5)' }}
        />
        <EntityOverlay
          entities={entities.filter((entity) => {
            // Never show user on enemy map
            if (entity.id === 'user') return false;
            // Never show opponent's spectral on enemy map (it shows on ally map)
            if (entity.id === OPPONENT_SPECTRAL_ENTITY_ID) return false;
            // Show enemy only when opponent is visible
            if (entity.id === 'enemy') {
              return opponentState?.playerStats?.position?.isSome && 
                     +opponentState.playerStats.position.isSome === 1;
            }
            // Always show user's spectral projection on enemy map (when it exists)
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
  );
}
