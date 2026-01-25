// app/providers.tsx
'use client';

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { Stater } from '../../../common/stater/stater';
import { Field, Int64, UInt64 } from 'o1js';
import { allWizards } from '../../../common/wizards';
import {
  PlayerStats,
  Position,
  PositionOption,
} from '../../../common/stater/structs';
import { useInventoryStore } from '@/lib/store';

export default function Initializer() {
  const { socket, setSocket, setStater, isBootstrapped, setBootstrapped } =
    useUserInformationStore();
  const statsByWizard = useInventoryStore((state) => state.statsByWizard);

  useEffect(() => {
    if (isBootstrapped) return;

    // Determine a stable playerId and persist it locally
    const existingId =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem('playerId')
        : null;
    const stablePlayerId =
      existingId ?? String(Math.floor(Math.random() * 10000));
    if (typeof window !== 'undefined' && !existingId) {
      window.sessionStorage.setItem('playerId', stablePlayerId);
    }

    // Create socket with auth so backend can rejoin by stable playerId
    const s: Socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      auth: { playerId: stablePlayerId },
    });
    setSocket(s);

    const stater = Stater.default();
    const defaultWizard = allWizards[0]!;
    const defaultWizardId = defaultWizard.id.toString();
    stater.state = defaultWizard.defaultState();

    stater.state.setPlayerStats(
      new PlayerStats({
        hp: stater.state.playerStats.hp,
        maxHp: stater.state.playerStats.maxHp,
        position: new PositionOption({
          value: new Position({
            x: Int64.from(Math.floor(Math.random() * 8)),
            y: Int64.from(Math.floor(Math.random() * 8)),
          }),
          isSome: Field(1),
        }),
        speed: Int64.from(1),
        attack: UInt64.from(statsByWizard[defaultWizardId]?.atk ?? 100),
        defense: UInt64.from(statsByWizard[defaultWizardId]?.def ?? 0),
        critChance: UInt64.from(statsByWizard[defaultWizardId]?.crit ?? 0),
        dodgeChance: UInt64.from(statsByWizard[defaultWizardId]?.dodge ?? 0),
        accuracy: UInt64.from(statsByWizard[defaultWizardId]?.accuracy ?? 0),
      })
    );

    setStater(stater);
    setBootstrapped(true);

    s.on('connect', () => console.log('socket connected'));
  }, [isBootstrapped, setBootstrapped, setSocket, setStater]);

  return null;
}
