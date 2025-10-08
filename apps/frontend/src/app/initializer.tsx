// app/providers.tsx
'use client';

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { Stater } from '../../../common/stater/stater';
import { Int64 } from 'o1js';
import { allWizards } from '../../../common/wizards';

export default function Initializer() {
  const { socket, setSocket, setStater, isBootstrapped, setBootstrapped } =
    useUserInformationStore();

  useEffect(() => {
    if (isBootstrapped) return;

    const s: Socket = io(process.env.NEXT_PUBLIC_API_URL!);
    setSocket(s);

    const stater = Stater.default();
    const defaultWizard = allWizards[0]!;
    stater.state = defaultWizard.defaultState();

    stater.state.playerStats.position.value.x = Int64.from(
      Math.floor(Math.random() * 8)
    );
    stater.state.playerStats.position.value.y = Int64.from(
      Math.floor(Math.random() * 8)
    );

    setStater(stater);
    setBootstrapped(true);

    s.on('connect', () => console.log('socket connected'));
  }, [isBootstrapped, setBootstrapped, setSocket, setStater]);

  return null;
}
