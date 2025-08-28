import { useUserInformationStore } from '@/lib/store/userInformationStore';
import { UserBar } from './UserBar';
import { Int64 } from 'o1js';
import { State } from '../../../../common/stater/state';

export function Users() {
  const { stater, opponentState } = useUserInformationStore();

  return (
    <div className="px-57 grid grid-cols-8 items-center">
      {/* Left user bar */}
      <UserBar
        name={stater?.state.playerId.toString() ?? ''}
        level={98}
        health={+stater!.state.playerStats.hp}
        maxHealth={100}
        className="col-span-3"
      />
      <div className="col-span-2" />
      {/* Right user bar */}
      <UserBar
        name={opponentState?.playerId.toString() ?? ''}
        level={30}
        // Fix it. playerStats.hp should be enough but it hydrated badly
        health={+opponentState!.playerStats.hp.magnitude}
        maxHealth={100}
        className="col-span-3"
      />
    </div>
  );
}
