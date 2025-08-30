'use client';

import HomePage from '@/components/HomePage';
import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { Stater } from '../../../common/stater/stater';
import { Field } from 'o1js';
import { allWizards } from '../../../common/wizards';

export default function Home() {
  const { socket, setSocket, setStater } = useUserInformationStore();
  useEffect(() => {
    console.log('useEffect');
    let socket = io(process.env.NEXT_PUBLIC_API_URL!);
    setSocket(socket);
    console.log(socket);

    const stater = Stater.default();
    stater.state = allWizards[0]!.defaultState();
    console.log(stater);
    setStater(stater);

    socket.on('connect', () => {
      console.log('connected');
    });
  }, []);

  return <HomePage />;
}
