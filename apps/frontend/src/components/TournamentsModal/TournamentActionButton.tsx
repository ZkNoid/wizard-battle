'use client';

import { Button } from '../shared/Button';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentActionButtonProps {
  tournament: ITournament;
  onClick?: (tournament: ITournament) => void;
}

type ActionConfig = {
  label: string;
  variant: 'gray' | 'blue' | 'green';
  disabled: boolean;
};

function getActionConfig(tournament: ITournament): ActionConfig {
  const { status, userStatus } = tournament;

  if (status === 'ended') {
    if (userStatus === 'won') {
      return { label: 'Claim rewards', variant: 'green', disabled: false };
    }
    return { label: 'Event ended', variant: 'gray', disabled: true };
  }

  switch (userStatus) {
    case 'not-joined':
      return { label: 'Join tournament', variant: 'blue', disabled: false };
    case 'got-ticket':
    case 'joined':
      return { label: 'Open tournament', variant: 'gray', disabled: false };
    case 'won':
      return { label: 'Claim rewards', variant: 'green', disabled: false };
    case 'lost':
    case 'pending':
      return { label: 'Open tournament', variant: 'gray', disabled: false };
    default:
      return { label: 'Join tournament', variant: 'blue', disabled: false };
  }
}

export function TournamentActionButton({
  tournament,
  onClick,
}: TournamentActionButtonProps) {
  const { label, variant, disabled } = getActionConfig(tournament);

  return (
    <Button
      variant={variant}
      className="h-12 w-full"
      disabled={disabled}
      onClick={() => onClick?.(tournament)}
      enableHoverSound
      enableClickSound
    >
      <span className="font-pixel text-sm font-bold">{label}</span>
    </Button>
  );
}
