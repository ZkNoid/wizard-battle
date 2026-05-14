'use client';

import { useRouter } from 'next/navigation';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';
import { Button } from '../shared/Button';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentActionButtonProps {
  tournament: ITournament;
  onJoin?: (tournament: ITournament) => void;
  onClaim?: (tournament: ITournament) => void;
  onOpen?: (tournament: ITournament) => void;
}

type ActionConfig = {
  label: string;
  labelColor?: 'text-main-gray' | 'text-white';
  variant: 'gray' | 'blue' | 'green';
  disabled: boolean;
  action: 'join' | 'claim' | 'findMatch' | 'none';
};

function isTournamentParticipant(userStatus: ITournament['userStatus']) {
  return (
    userStatus === 'got-ticket' ||
    userStatus === 'joined' ||
    userStatus === 'pending' ||
    userStatus === 'lost'
  );
}

function getActionConfig(tournament: ITournament): ActionConfig {
  const { status, userStatus } = tournament;

  // Winner-state buttons — these take priority over the tournament status
  // because winners stay claimable through the entire claim window even
  // after the battle has ended.
  if (userStatus === 'won') {
    return {
      label: 'Claim rewards',
      labelColor: status === 'ended' ? 'text-main-gray' : undefined,
      variant: 'green',
      disabled: false,
      action: 'claim',
    };
  }

  if (userStatus === 'claimed') {
    return {
      label: 'Claimed',
      labelColor: 'text-main-gray',
      variant: 'gray',
      disabled: true,
      action: 'none',
    };
  }

  if (status === 'ended') {
    return {
      label: 'Event ended',
      labelColor: 'text-main-gray',
      variant: 'gray',
      disabled: true,
      action: 'none',
    };
  }

  if (status === 'upcoming') {
    if (userStatus === 'pending') {
      return {
        label: 'Confirming…',
        variant: 'gray',
        disabled: true,
        action: 'none',
      };
    }
    if (isTournamentParticipant(userStatus)) {
      return {
        label: 'Battle starts soon',
        variant: 'gray',
        disabled: true,
        action: 'none',
      };
    }
    return {
      label: 'Join opens at battle start',
      variant: 'gray',
      disabled: true,
      action: 'none',
    };
  }

  if (status === 'active' && isTournamentParticipant(userStatus)) {
    return {
      label: 'Find Match',
      variant: 'blue',
      disabled: false,
      action: 'findMatch',
    };
  }

  return {
    label: 'Join tournament',
    labelColor: 'text-white',
    variant: 'blue',
    disabled: false,
    action: 'join',
  };
}

export function TournamentActionButton({
  tournament,
  onJoin,
  onClaim,
  onOpen,
}: TournamentActionButtonProps) {
  const router = useRouter();
  const setIsTournamentsModalOpen = useMiscellaneousSessionStore(
    (s) => s.setIsTournamentsModalOpen
  );
  const { label, labelColor, variant, disabled, action } = getActionConfig(tournament);

  const handleClick = () => {
    if (action === 'join') onJoin?.(tournament);
    else if (action === 'claim') onClaim?.(tournament);
    else if (action === 'findMatch') {
      setIsTournamentsModalOpen(false);
      router.push(
        `/play?tournamentId=${encodeURIComponent(tournament.id)}`
      );
    }
  };

  return (
    <Button
      variant={variant}
      className="h-full w-full"
      disabled={disabled}
      onClick={handleClick}
      enableHoverSound
      enableClickSound
    >
      <span className={`font-pixel text-sm font-bold ${labelColor ?? 'text-white'}`}>{label}</span>
    </Button>
  );
}
