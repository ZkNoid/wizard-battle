'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMinaAppkit } from 'mina-appkit';
import { Int64 } from 'o1js';

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
import {
  Tilemap,
  EntityOverlay,
  EffectOverlay,
  gameEventEmitter,
  EntityType,
} from '@/engine';

// Constants
const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;
const TILE_SIZE = 60;
const DEFAULT_USER_POSITION = { x: 3, y: 3 };
const SCENE_READY_DELAY = 100;

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

  // Store hooks
  const { stater, opponentState, gamePhaseManager, setActionSend, actionSend } =
    useUserInformationStore();
  const { pickedSpellId, setPickedSpellId } = useInGameStore();
  const { addEntity, getAllEntities, initMovementHandler, clearEntities } =
    useEngineStore();

  // Refs
  const isInitialized = useRef<boolean>(false);
  const staterRef = useRef(stater);
  const opponentStateRef = useRef(opponentState);

  // Derived state
  const entities = getAllEntities();

  // Utility functions
  const indexToCoordinates = useCallback((index: number) => {
    const x = index % GRID_WIDTH;
    const y = Math.floor(index / GRID_WIDTH);
    return { x, y };
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
          spell.modifyerData.toJSON(cast.additionalData)
        ),
      };
    },
    [stater?.state, opponentState]
  );

  const submitSpellAction = useCallback(
    (
      userAction: IUserAction,
      updatedActionInfo: { movementDone: boolean; spellCastDone: boolean }
    ) => {
      if (!updatedActionInfo.movementDone || !updatedActionInfo.spellCastDone) {
        console.log('Adding to prepared actions');
        setPreparedActions([...preparedActions, userAction]);
        return;
      }

      console.log('Submitting actions');

      const userActions: IUserActions = {
        actions: [...preparedActions, userAction],
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

        if (Math.abs(userX - x) + Math.abs(userY - y) >= 2) {
          console.log('Location is too far away');
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

      const userAction = createUserAction(spellId.toString(), x, y, isEnemy);
      if (!userAction) return;

      console.log('userAction:', userAction);
      setActionInfo(updatedActionInfo);
      submitSpellAction(userAction, updatedActionInfo);

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

      if (spell) {
        gameEventEmitter.playAnimationOneTime(
          'user',
          spell.name.toLowerCase(),
          3.6
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

    const newXAlly = +state.playerStats.position.value.x;
    const newYAlly = +state.playerStats.position.value.y;
    console.log('Moving user to:', newXAlly, newYAlly);
    gameEventEmitter.move('user', newXAlly, newYAlly);

    if (!opponentStateRef.current) {
      console.log('Opponent state not found');
      return;
    }

    const opponentState = opponentStateRef.current;
    if (+opponentState.playerStats.position.isSome) {
      const newXEnemy = +opponentState.playerStats.position.value.x;
      const newYEnemy = +opponentState.playerStats.position.value.y;
      gameEventEmitter.move('enemy', newXEnemy, newYEnemy);
    } else {
      gameEventEmitter.move('enemy', -1, -1);
    }
  }, [setActionSend]);

  // Effects
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

  useEffect(() => {
    staterRef.current = stater;
  }, [stater]);

  useEffect(() => {
    opponentStateRef.current = opponentState;
  }, [opponentState]);

  useEffect(() => {
    if (!isInitialized.current) {
      const cleanupMovement = initMovementHandler();

      const user = {
        id: 'user',
        type: EntityType.WIZARD,
        tilemapPosition: DEFAULT_USER_POSITION,
      };

      addEntity(user);

      const enemy = {
        id: 'enemy',
        type: EntityType.WIZARD,
        tilemapPosition: DEFAULT_USER_POSITION,
      };

      addEntity(enemy);

      isInitialized.current = true;

      return () => {
        cleanupMovement();
        clearEntities();
        isInitialized.current = false;
      };
    }
  }, [initMovementHandler, addEntity, clearEntities]);

  useEffect(() => {
    gamePhaseManager?.setOnNewTurnHook(onNewTurnHook);
  }, [gamePhaseManager, onNewTurnHook]);

  // Cleanup game phase manager on unmount
  useEffect(() => {
    return () => {
      gamePhaseManager?.cleanup();
    };
  }, [gamePhaseManager]);

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
        />
        <EntityOverlay
          entities={entities.filter((entity) => entity.id !== 'enemy')}
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
        />
        <EntityOverlay
          entities={
            opponentState &&
            opponentState.playerStats.position &&
            +opponentState.playerStats.position.isSome
              ? entities.filter((entity) => entity.id !== 'user')
              : []
          }
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
