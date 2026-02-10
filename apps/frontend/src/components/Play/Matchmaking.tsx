'use client';

import { PlaySteps } from '@/lib/enums/PlaySteps';
import { PlayMode } from '@/lib/enums/PlayMode';
import { ModeBg } from './assets/mode-bg';
import { Button } from '../shared/Button';
import { TimeIcon } from './assets/time-icon';
import { QueueIcon } from './assets/queue-icon';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { useInGameStore } from '@/lib/store/inGameStore';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stater } from '../../../../common/stater/stater';
import type {
  IPublicState,
  IFoundMatch,
  IUpdateQueue,
} from '../../../../common/types/matchmaking.types';
import type { IReward } from '../../../../common/types/gameplay.types';
import { State } from '../../../../common/stater/state';
import { GamePhaseManager } from '@/game/GamePhaseManager';
import { Field, Int64 } from 'o1js';
import { useMinaAppkit } from 'mina-appkit';

export default function Matchmaking({
  setPlayStep,
  playMode,
}: {
  setPlayStep: (playStep: PlaySteps) => void;
  playMode: PlayMode;
}) {
  const router = useRouter();
  const { address } = useMinaAppkit();
  const { socket, stater, setOpponentState, setGamePhaseManager, setStater } =
    useUserInformationStore();
  const { setCurrentPhase } = useInGameStore();

  const sendRequest = useRef(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  const onGameEnd = (winner: boolean, reward?: IReward[]) => {
    setTimeout(() => {
      const goldReward = reward?.find((item) => item.itemId === 'Gold');
      const params = new URLSearchParams({
        winner: winner.toString(),
        ...(goldReward && {
          gold: goldReward.amount.toString(),
          total: goldReward.total.toString(),
        }),
      });
      router.push(`/gameResults?${params.toString()}`);
    }, 1000);
  };

  useEffect(() => {
    if (!socket || !stater) return;

    const handleMatchFound = (response: IFoundMatch) => {
      console.log(
        '🎮 Match found! Creating GamePhaseManager and confirming joined...'
      );

      console.log('Match found! opponentId', response.opponentId);

      let opponentState = State.fromJSON(
        JSON.parse(response.opponentSetup[0]!.fields)
      ) as State;

      setOpponentState(opponentState as State);

      setGamePhaseManager(
        new GamePhaseManager(
          socket,
          response.roomId,
          stater,
          opponentState,
          setOpponentState,
          setCurrentPhase,
          onGameEnd,
          setStater
        )
      );
      router.push(`/game`);
    };

    // Handler for queue updates
    const handleUpdateQueue = (data: IUpdateQueue) => {
      console.log('📊 Queue update received:', data);
      setQueuePosition(data.playersAmount);
    };

    // Always register the listeners (runs every time effect executes)
    socket.on('matchFound', handleMatchFound);
    socket.on('updateQueue', handleUpdateQueue);

    // Only send matchmaking request once
    if (!sendRequest.current) {
      sendRequest.current = true;

      // Reuse stable playerId from sessionStorage (fallback to random if missing)
      const stored =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem('playerId')
          : null;
      const playerId = stored
        ? Number(stored)
        : Math.floor(Math.random() * 10000);
      if (typeof window !== 'undefined' && !stored) {
        window.sessionStorage.setItem('playerId', String(playerId));
      }
      stater.state.playerId = Field.from(playerId);

      let publicState = stater.generatePublicState();

      let data = {
        playerId,
        userId: address ?? undefined, // Send wallet address as userId for reward distribution
        playerSetup: {
          socketId: socket.id!,
          playerId: playerId.toString(),
          userId: address ?? undefined, // Also set userId in playerSetup for backend storage
          fields: JSON.stringify(State.toJSON(publicState)),
        } satisfies IPublicState,
        nonce: 0,
        signature: '',
        setupProof: '',
      };

      console.log(data);

      if (playMode === PlayMode.PVE) {
        socket.emit('joinBotMatchmaking', {
          addToQueue: data,
        });
      } else {
        socket.emit('joinMatchmaking', {
          addToQueue: data,
        });
      }
    }

    // Always cleanup: removes listeners on unmount or before re-run
    return () => {
      socket.off('matchFound', handleMatchFound);
      socket.off('updateQueue', handleUpdateQueue);
    };
  }, [socket, stater]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="px-15 py-13.5 w-143 h-143 relative flex flex-col items-center">
      <span className="font-pixel text-main-gray mt-7 text-3xl">
        Matchmaking
      </span>
      <div className="mt-10 flex flex-col gap-10">
        {/* Time Spent */}
        <div className="flex items-center gap-5">
          <TimeIcon className="h-20 w-20" />
          <div className="font-pixel text-main-gray flex flex-col gap-1">
            <span className="text-xl">Time Spent:</span>
            <span className="text-3xl">{formatTime(elapsedTime)}</span>
          </div>
        </div>
        {/* Queue Position */}
        <div className="flex items-center gap-5">
          <QueueIcon className="h-20 w-20" />
          <div className="font-pixel text-main-gray flex flex-col gap-1">
            <span className="text-xl">Place in Queue:</span>
            <span className="text-3xl">
              {queuePosition !== null ? queuePosition : '...'}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-auto flex w-full flex-col items-center justify-center">
        <Button
          variant="gray"
          className="w-106 h-15"
          onClick={() => {
            setPlayStep(PlaySteps.SELECT_MAP);
          }}
        >
          Cancel
        </Button>
      </div>
      <ModeBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
    </div>
  );
}
