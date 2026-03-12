'use client';

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
  labelColor: 'text-main-gray' | 'text-white';
  variant: 'gray' | 'blue' | 'green';
  disabled: boolean;
  action: 'join' | 'claim' | 'open' | 'none';
};

function getActionConfig(tournament: ITournament): ActionConfig {
  const { status, userStatus } = tournament;

  if (status === 'ended') {
    if (userStatus === 'won') {
      return {
        label: 'Claim rewards',
        labelColor: 'text-main-gray',
        variant: 'green',
        disabled: false,
        action: 'claim',
      };
    }
    return {
      label: 'Event ended',
      labelColor: 'text-main-gray',
      variant: 'gray',
      disabled: true,
      action: 'none',
    };
  }

  switch (userStatus) {
    case 'not-joined':
      return {
        label: 'Join tournament',
        labelColor: 'text-white',
        variant: 'blue',
        disabled: false,
        action: 'join',
      };
    case 'got-ticket':
    case 'joined':
      return {
        label: 'Open tournament',
        labelColor: 'text-main-gray',
        variant: 'gray',
        disabled: false,
        action: 'open',
      };
    case 'won':
      return {
        label: 'Claim rewards',
        labelColor: 'text-main-gray',
        variant: 'green',
        disabled: false,
        action: 'claim',
      };
    case 'lost':
    case 'pending':
      return {
        label: 'Open tournament',
        labelColor: 'text-main-gray',
        variant: 'gray',
        disabled: false,
        action: 'open',
      };
    default:
      return {
        label: 'Join tournament',
        labelColor: 'text-white',
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
  onOpen,
}: TournamentActionButtonProps) {
  const { label, labelColor, variant, disabled, action } = getActionConfig(tournament);

  const handleClick = () => {
    if (action === 'join') onJoin?.(tournament);
    else if (action === 'claim') onClaim?.(tournament);
    else if (action === 'open') onOpen?.(tournament);
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
      <span className={`font-pixel text-sm font-bold ${labelColor}`}>{label}</span>
    </Button>
  );
}
