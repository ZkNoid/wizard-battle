'use client';

import { useRouter } from 'next/navigation';
import { Button } from '../shared/Button';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentActionButtonProps {
  tournament: ITournament;
  onJoin?: (tournament: ITournament) => void;
  onClaim?: (tournament: ITournament) => void;
}

type ActionConfig = {
  label: string;
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

  if (status === 'ended') {
    if (userStatus === 'won') {
      return {
        label: 'Claim rewards',
        variant: 'green',
        disabled: false,
        action: 'claim',
      };
    }
    return {
      label: 'Event ended',
      variant: 'gray',
      disabled: true,
      action: 'none',
    };
  }

  if (status === 'active' && userStatus === 'won') {
    return {
      label: 'Claim rewards',
      variant: 'green',
      disabled: false,
      action: 'claim',
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

  switch (userStatus) {
    case 'not-joined':
      return {
        label: 'Join tournament',
        variant: 'blue',
        disabled: false,
        action: 'join',
      };
    case 'won':
      return {
        label: 'Claim rewards',
        variant: 'green',
        disabled: false,
        action: 'claim',
      };
    default:
      return {
        label: 'Join tournament',
        variant: 'blue',
        disabled: false,
        action: 'join',
      };
  }
}

export function TournamentActionButton({
  tournament,
  onJoin,
  onClaim,
}: TournamentActionButtonProps) {
  const router = useRouter();
  const { label, variant, disabled, action } = getActionConfig(tournament);

  const handleClick = () => {
    if (action === 'join') onJoin?.(tournament);
    else if (action === 'claim') onClaim?.(tournament);
    else if (action === 'findMatch') {
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
      <span className="font-pixel-klein text-md font-bold">{label}</span>
    </Button>
  );
}
