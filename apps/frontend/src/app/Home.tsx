'use client';

import HomePage from '@/components/HomePage';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { Stater } from '../../../common/stater/stater';
import { Field, Int64 } from 'o1js';
import { allWizards } from '../../../common/wizards';

export default function Home() {
  const { socket, setSocket, setStater } = useUserInformationStore();
  useEffect(() => {
    console.log('useEffect');
    let socket = io(process.env.NEXT_PUBLIC_API_URL!);
    setSocket(socket);
    console.log(socket);

    const stater = Stater.default();
    stater.state.playerStats.position.value.x = Int64.from(
      Math.floor(Math.random() * 8)
    );
    stater.state.playerStats.position.value.y = Int64.from(
      Math.floor(Math.random() * 8)
    );
    console.log(stater);
    setStater(stater);

    socket.on('connect', () => {
      console.log('connected');
    });
  }, []);

  return <HomePage />;
}
