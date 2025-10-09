'use client';

import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { UserBar } from './UserBar';
import { formatAddress, useMinaAppkit } from 'mina-appkit';
import { api } from '@/trpc/react';
import { useEffect, useState } from 'react';
import { levelFromXp } from '@/lib/constants/levels';
import { WizardId } from '../../../../common/wizards';

export function Users() {
  const { stater, opponentState } = useUserInformationStore();
  const { address } = useMinaAppkit();

  const [playerName, setPlayerName] = useState<string>('You');
  const [opponentName, setOpponentName] = useState<string>('Opponent');

  const { data: user } = api.users.get.useQuery(
    {
      address: address ?? '',
    },
    {
      enabled: !!address,
    }
  );

  useEffect(() => {
    if (address && user) {
      setPlayerName(user.name ?? formatAddress(address));
    }
  }, [user, address]);

  // TODO: Uncomment this when we have a way to get the opponent's account

  // const { data: opponentAccount } = api.users.get.useQuery(
  //   {
  //     address: opponentAddress ?? '',
  //   },
  //   {
  //     enabled: !!opponentAddress,
  //   }
  // );

  // useEffect(() => {
  //   if (opponentAddress && opponentAccount) {
  //     setOpponentName(opponentAccount.name ?? formatAddress(opponentAddress));
  //   }
  // }, [opponentAccount, opponentAddress]);

  return (
    <div className="col-span-6 row-span-1 grid grid-cols-6 items-center gap-x-5">
      {/* Left user bar */}
      <UserBar
        name={
          stater
            ? `${playerName} (${stater?.state.playerId.toString()})`
            : playerName
        }
        level={user && user.xp ? levelFromXp(user.xp) : 0}
        health={stater ? +stater!.state.playerStats.hp : 0}
        maxHealth={100}
        // TODO: Add elve handling
        wizardType={
          stater?.state.wizardId.toString() === WizardId.MAGE.toString()
            ? 'wizard'
            : 'warrior'
        }
        className="col-span-3 col-start-1"
      />
      {/* Right user bar */}
      <UserBar
        name={
          opponentState
            ? `${opponentName} (${opponentState?.playerId.toString()})`
            : opponentName
        }
        // TODO: Uncomment this when we have a way to get the opponent's account
        // level={opponentAccount && opponentAccount.xp ? levelFromXp(opponentAccount.xp) : 0}
        level={0}
        health={opponentState ? +opponentState!.playerStats.hp : 0}
        maxHealth={100}
        wizardType={
          stater?.state.wizardId.toString() === WizardId.MAGE.toString()
            ? 'wizard'
            : 'warrior'
        }
        className="col-span-3 col-start-4"
      />
    </div>
  );
}
