'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, useMemo } from 'react';
import type { IRefPhaserGame } from '@/PhaserGame';
import Game from '@/components/Game';
import { api } from '@/trpc/react';
import { FullscreenLoader } from '@/components/shared/FullscreenLoader';
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
import { Game as GameScene } from '@/game/scenes/Game';
import { EventBus } from '@/game/EventBus';

const PhaserGame = dynamic(
  () => import('@/PhaserGame').then((mod) => mod.PhaserGame),
  {
    ssr: false,
    loading: () => <FullscreenLoader />,
  }
);

export default function GamePage() {
  //  References to the PhaserGame component (game and scene are exposed)
  const { stater, opponentState, gamePhaseManager } = useUserInformationStore();
  const { pickedSpellId } = useInGameStore();
  const phaserRefAlly = useRef<IRefPhaserGame | null>(null);
  const phaserRefEnemy = useRef<IRefPhaserGame | null>(null);
  const router = useRouter();
  const { address } = useMinaAppkit();

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

  // Memoize click handlers to prevent unnecessary re-renders
  const handleAllyMapClickMemo = useMemo(() => {
    return (x: number, y: number) => {
      console.log('Ally map clicked: ', x, y);
      console.log('Can player act: ', canPlayerAct);
      if (canPlayerAct) {
        handleAllyMapClick(x, y);
      }
    };
  }, [canPlayerAct, stater?.state, opponentState?.playerId, gamePhaseManager]);

  const handleEnemyMapClickMemo = useMemo(() => {
    return (x: number, y: number) => {
      console.log('Enemy map clicked: ', x, y);
      console.log('Can player act: ', canPlayerAct);
      if (canPlayerAct) {
        handleEnemyMapClick(x, y);
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

  const handleEnemyMapClick = (x: number, y: number) => {
    console.log('Enemy map clicked: ', x, y);

    if (!pickedSpellId) {
      console.log('No spell picked');
      return;
    }

    const spell = allSpells.find(
      (spell) => spell.id.toString() === pickedSpellId.toString()
    );

    if (!spell) {
      console.log('Spell not found');
      return;
    }

    let cast = spell.cast(stater?.state!, opponentState!.playerId, {
      x,
      y,
    });
    console.log('Cast: ', cast);

    if (!opponentState?.playerId) {
      console.log('Opponent state not found');
      return;
    }

    const userAction: IUserAction = {
      playerId: opponentState!.playerId.toString(),
      spellId: spell.id.toString(),
      spellCastInfo: cast.additionalData,
    };

    const userActions: IUserActions = {
      actions: [userAction],
      signature: '',
    };

    gamePhaseManager?.submitPlayerActions(userActions);
  };

  const handleAllyMapClick = (x: number, y: number) => {
    console.log('Ally map clicked: ', x, y);

    let spellId = pickedSpellId;

    if (!pickedSpellId) {
      spellId = SpellId['Move'] ?? null;
    }

    if (!spellId) {
      console.log('No move spell id ');
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

    if (!stater?.state) {
      console.log('Stater state not found');
      return;
    }

    const userAction: IUserAction = {
      playerId: stater.state.playerId.toString(),
      spellId: spell.id.toString(),
      spellCastInfo: cast.additionalData,
    };

    const userActions: IUserActions = {
      actions: [userAction],
      signature: '',
    };

    gamePhaseManager?.submitPlayerActions(userActions);
  };

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

    if (!instance) {
      console.log('Instance not found');
      return;
    }

    const scene = instance.game?.scene.getScene('Game');

    if (!scene) {
      console.log('Scene not found');
      return;
    }

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

  useEffect(() => {
    const onNewTurnHook = () => {
      const newXAlly = +(
        staterRef.current?.state?.playerStats.position.value.x.magnitude.toString() ??
        0
      );
      const newYAlly = +(
        staterRef.current?.state?.playerStats.position.value.y.magnitude.toString() ??
        0
      );
      emitMovePlayerEvent(newXAlly, newYAlly, 'ally');

      // Fix this terrible code with hydration
      if (+(opponentStateRef.current?.playerStats.position.isSome as any)) {
        const newXEnemy = +(
          opponentStateRef.current?.playerStats.position.value.x.magnitude.toString() ??
          '0'
        );
        const newYEnemy = +(
          opponentStateRef.current?.playerStats.position.value.y.magnitude.toString() ??
          '0'
        );
        emitMovePlayerEvent(newXEnemy, newYEnemy, 'enemy');
      } else {
        emitMovePlayerEvent(-1, -1, 'enemy');
      }
    };
    gamePhaseManager?.setOnNewTurnHook(() => {
      onNewTurnHook();
    });

    // TODO not working
    EventBus.on(
      'current-scene-ready',
      (scene_instance: Phaser.Scene, gameInstance: string) => {
        console.log('!!current-scene-ready', scene_instance, gameInstance);
        onNewTurnHook();
      }
    );

    setTimeout(() => {
      onNewTurnHook();
    }, 2000);

    return () => {
      EventBus.removeListener('current-scene-ready');
    };
  }, [gamePhaseManager]);

  return (
    <Game>
      <PhaserGame
        ref={phaserRefAlly}
        currentActiveScene={currentScene}
        container="game-container-ally"
        isEnemy={false}
        tilemapData={allyTilemapData}
        onMapClick={handleAllyMapClickMemo}
      />
      <PhaserGame
        ref={phaserRefEnemy}
        currentActiveScene={currentScene}
        container="game-container-enemy"
        isEnemy={true}
        tilemapData={enemyTilemapData}
        onMapClick={handleEnemyMapClickMemo}
      />
    </Game>
  );
}
