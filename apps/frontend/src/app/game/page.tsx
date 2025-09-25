'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { IRefPhaserGame } from '@/PhaserGame';
import Game from '@/components/Game';
import { api } from '@/trpc/react';
import { useMinaAppkit } from 'mina-appkit';
import { useRouter } from 'next/navigation';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { allSpells, SpellId } from '../../../../common/stater/spells';
import { useInGameStore } from '@/lib/store/inGameStore';
import type {
  IUserAction,
  IUserActions,
} from '../../../../common/types/gameplay.types';
import { GamePhase } from '../../../../common/types/gameplay.types';
import { Position } from '../../../../common/stater/structs';
import { Int64 } from 'o1js';
import { EventBus } from '@/game/EventBus';
import {
  Tilemap,
  EntityOverlay,
  EffectOverlay,
  gameEventEmitter,
  EntityType,
} from '@/engine';
import { useEngineStore } from '@/lib/store/engineStore';

const MEGA_W = 8;
const MEGA_H = 8;

export default function GamePage() {
  //  References to the PhaserGame component (game and scene are exposed)
  const { stater, opponentState, gamePhaseManager, setActionSend, actionSend } =
    useUserInformationStore();
  const { pickedSpellId } = useInGameStore();
  const { addEntity, getAllEntities, initMovementHandler, clearEntities } =
    useEngineStore();
  const phaserRefAlly = useRef<IRefPhaserGame | null>(null);
  const phaserRefEnemy = useRef<IRefPhaserGame | null>(null);
  const isInitialized = useRef<boolean>(false);
  const router = useRouter();
  const { address } = useMinaAppkit();
  const entities = getAllEntities();

  const [canPlayerAct, setCanPlayerAct] = useState<boolean>(false);

  const { data: tilemapData } = api.tilemap.getTilemap.useQuery(
    {
      userAddress: address ?? '',
      slot: '1',
    },
    {
      enabled: !!address,
    }
  );

  // Memoize tilemap data to prevent unnecessary re-renders
  const allyTilemapData = useMemo(() => {
    return stater?.state?.map.map((tile) => +tile) || [];
  }, [stater?.state?.map]);

  const enemyTilemapData = useMemo(() => {
    return opponentState?.map.map((tile) => +tile) || [];
  }, [opponentState?.map]);

  // Unified map click handler for both ally and enemy maps
  const handleMapClick = (x: number, y: number, isEnemy: boolean) => {
    console.log(`${isEnemy ? 'Enemy' : 'Ally'} map clicked: `, x, y);

    let spellId = pickedSpellId;

    // If no spell is picked and clicking on ally map, default to move spell
    if (!pickedSpellId && !isEnemy) {
      spellId = SpellId['Move'] ?? null;
    }

    if (!spellId) {
      console.log('No spell picked');
      return;
    }

    const spell = allSpells.find(
      (spell) => spell.id.toString() === spellId.toString()
    );

    if (!spell) {
      console.log('Spell not found');
      return;
    }

    let cast = spell.cast(
      stater?.state!,
      opponentState!.playerId,
      new Position({
        x: Int64.from(x),
        y: Int64.from(y),
      })
    );
    console.log('Cast: ', cast);

    // Determine which player ID to use based on map type
    const targetPlayerId = isEnemy
      ? opponentState?.playerId?.toString()
      : stater?.state?.playerId?.toString();

    if (!targetPlayerId) {
      console.log(`${isEnemy ? 'Opponent' : 'Stater'} state not found`);
      return;
    }

    const userAction: IUserAction = {
      playerId: targetPlayerId,
      spellId: spell.id.toString(),
      spellCastInfo: JSON.stringify(
        spell.modifyerData.toJSON(cast.additionalData)
      ),
    };

    console.log('userAction: ', userAction);

    const userActions: IUserActions = {
      actions: [userAction],
      signature: '',
    };

    gamePhaseManager?.submitPlayerActions(userActions);

    gameEventEmitter.playAnimationOneTime(
      'user',
      `${spell.name.toLowerCase()}Start`,
      1.2
    );

    setActionSend(true);
  };

  // Memoize click handlers to prevent unnecessary re-renders
  const handleAllyMapClickMemo = useMemo(() => {
    return (x: number, y: number) => {
      console.log('Ally map clicked: ', x, y);
      console.log('Can player act: ', canPlayerAct);
      if (canPlayerAct) {
        handleMapClick(x, y, false);
      }
    };
  }, [
    canPlayerAct,
    pickedSpellId,
    stater?.state,
    opponentState?.playerId,
    gamePhaseManager,
  ]);

  const handleEnemyMapClickMemo = useMemo(() => {
    return (x: number, y: number) => {
      console.log('Enemy map clicked: ', x, y);
      console.log('Can player act: ', canPlayerAct);
      if (canPlayerAct) {
        handleMapClick(x, y, true);
      }
    };
  }, [
    canPlayerAct,
    pickedSpellId,
    stater?.state,
    opponentState?.playerId,
    gamePhaseManager,
  ]);

  // Event emitted from the PhaserGame component
  const currentScene = (scene: Phaser.Scene) => {
    console.log('Scene changed:', scene);
    // Refs are now updated in PhaserGame component based on instance type
  };

  // Redirect to home if no address is found
  useEffect(() => {
    if (!address) {
      router.replace('/');
    }
  }, [address]);

  // Initialize movement system and create red square (only once)
  useEffect(() => {
    if (!isInitialized.current) {
      // Initialize movement handler
      const cleanupMovement = initMovementHandler();

      // Create red square entity
      const user = {
        id: 'user',
        type: EntityType.WIZARD,
        tilemapPosition: { x: 3, y: 3 },
      };

      addEntity(user);
      isInitialized.current = true;

      // Return combined cleanup function
      return () => {
        cleanupMovement(); // Clean up movement handler
        clearEntities(); // Clear entities
        isInitialized.current = false;
      };
    }
  }, [initMovementHandler, addEntity, clearEntities]);

  // Emit move ally | enemy event to the scene
  const emitMovePlayerEvent = (
    xTile: number,
    yTile: number,
    targetInstance: 'ally' | 'enemy'
  ) => {
    console.log('emitMovePlayerEvent', xTile, yTile, targetInstance);
    const instance =
      targetInstance === 'ally'
        ? phaserRefAlly.current
        : phaserRefEnemy.current;

    if (!instance || !instance.game) {
      console.log('Instance not found');
      return;
    }

    const scene = instance.game?.scene.getScene('Game');

    if (!scene) {
      console.log('Scene not found');
      return;
    }

    console.log(
      `move-player event received in Game scene, targetInstance: ${targetInstance}`
    );
    console.log(`gameInstance: ${targetInstance}`);

    scene.events.emit(
      `move-player-${targetInstance}`,
      xTile,
      yTile,
      targetInstance
    );
  };

  useEffect(() => {
    if (gamePhaseManager?.currentPhase === GamePhase.SPELL_CASTING) {
      setCanPlayerAct(true);
    } else {
      setCanPlayerAct(false);
    }
  }, [gamePhaseManager?.currentPhase]);

  // Use refs to always access the latest values in the closure
  const staterRef = useRef(stater);
  const opponentStateRef = useRef(opponentState);

  // Update refs when values change
  useEffect(() => {
    staterRef.current = stater;
  }, [stater]);

  useEffect(() => {
    opponentStateRef.current = opponentState;
  }, [opponentState]);

  const onNewTurnHook = () => {
    if (!staterRef.current) {
      console.log('Stater not found');
      return;
    }

    setActionSend(false);

    console.log('staterRef.current.state');
    console.log(staterRef.current.state);
    const newXAlly = +staterRef.current.state.playerStats.position.value.x;
    const newYAlly = +staterRef.current.state.playerStats.position.value.y;
    // emitMovePlayerEvent(newXAlly, newYAlly, 'ally');
    console.log('Moving user to ', newXAlly, newYAlly);
    gameEventEmitter.move('user', newXAlly, newYAlly);

    if (!opponentStateRef.current) {
      console.log('Opponent state not found');
      return;
    }

    if (+opponentStateRef.current.playerStats.position.isSome) {
      const newXEnemy = +opponentStateRef.current.playerStats.position.value.x;
      const newYEnemy = +opponentStateRef.current.playerStats.position.value.y;
      // emitMovePlayerEvent(newXEnemy, newYEnemy, 'enemy');
      gameEventEmitter.move('enemy', newXEnemy, newYEnemy);
    } else {
      // emitMovePlayerEvent(-1, -1, 'enemy');
      gameEventEmitter.move('enemy', -1, -1);
    }
  };

  useEffect(() => {
    gamePhaseManager?.setOnNewTurnHook(() => {
      onNewTurnHook();
    });
  }, [gamePhaseManager]);

  useEffect(() => {
    // Don't call onNewTurnHook immediately - wait for scenes to be ready

    EventBus.on(
      'current-scene-ready',
      (scene_instance: Phaser.Scene, gameInstance: string) => {
        console.log('!!current-scene-ready', scene_instance, gameInstance);
        // Call the hook when both scenes are ready
        setTimeout(() => {
          onNewTurnHook();
        }, 100);
      }
    );

    // Fallback timeout to ensure the hook is called eventually
    const fallbackTimeout = setTimeout(() => {
      onNewTurnHook();
    }, 5000);

    return () => {
      EventBus.removeListener('current-scene-ready');
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // Function to convert tile index to x,y coordinates
  const indexToCoordinates = (index: number) => {
    const x = index % MEGA_W;
    const y = Math.floor(index / MEGA_W);
    return { x, y };
  };

  // // Handler for left tilemap click to move red square
  const handleTilemapClick = (index: number) => {
    const { x, y } = indexToCoordinates(index);
    handleMapClick;
    handleMapClick(x, y, false);

    //   gameEventEmitter.playAnimationOneTime('user', 'teleportStart', 1.2);
    //   gameEventEmitter.throwEffect('user', 'teleport', x, y, 1.2);
    //   setTimeout(() => {
    //     gameEventEmitter.move('user', x, y);
    //   }, 1000);
  };

  // // Handler for right tilemap click to move blue square
  const handleTilemapClickEnemy = (index: number) => {
    const { x, y } = indexToCoordinates(index);
    handleMapClick(x, y, true);

    //   gameEventEmitter.throwEffect('enemy', 'fireball', x, y, 1.5);
  };

  return (
    <Game>
      {/* Left half */}
      <div className="space-y-2">
        <div className="relative">
          <Tilemap
            width={MEGA_W}
            height={MEGA_H}
            tileSize={60}
            tilemap={tilemapData ?? []}
            onTileClick={handleTilemapClick}
            className="h-full w-full cursor-pointer"
          />
          {/* Overlay with entities */}
          <EntityOverlay
            entities={entities.filter((entity) => entity.id !== 'enemy')}
            gridWidth={MEGA_W}
            gridHeight={MEGA_H}
          />
          {/* Overlay with effects */}
          <EffectOverlay
            overlayId="user"
            gridWidth={MEGA_W}
            gridHeight={MEGA_H}
          />
        </div>
      </div>

      {/* Right half*/}
      <div className="relative">
        {actionSend && (
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 transform text-center text-lg font-bold text-white">
            Waiting for opponent turn
          </div>
        )}
        <Tilemap
          width={MEGA_W}
          height={MEGA_H}
          tileSize={60}
          tilemap={tilemapData ?? []}
          onTileClick={handleTilemapClickEnemy}
          className="cursor-pointer"
        />
        {/* Overlay with entities */}
        <EntityOverlay
          entities={entities.filter((entity) => entity.id !== 'user')}
          gridWidth={MEGA_W}
          gridHeight={MEGA_H}
        />
        {/* Overlay with effects */}
        <EffectOverlay
          overlayId="enemy"
          gridWidth={MEGA_W}
          gridHeight={MEGA_H}
        />
      </div>
    </Game>
  );
}
