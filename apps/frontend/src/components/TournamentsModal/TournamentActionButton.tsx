'use client';

import { Button } from '../shared/Button';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentActionButtonProps {
  tournament: ITournament;
  onClick?: (tournament: ITournament) => void;
}

type ActionConfig = {
  label: string;
  variant: 'gray' | 'blue' | 'red';
  disabled: boolean;
};

function getActionConfig(tournament: ITournament): ActionConfig {
  const { status, userStatus } = tournament;

  if (status === 'ended') {
    const hasResult =
      userStatus === 'won' || userStatus === 'lost' || userStatus === 'pending';
    return {
      label: hasResult ? 'Results' : 'Ended',
      variant: 'gray',
      disabled: !hasResult,
    };
  }

  switch (userStatus) {
    case 'not-joined':
      return { label: 'Join', variant: 'blue', disabled: false };
    case 'got-ticket':
      return { label: 'Enter', variant: 'blue', disabled: false };
    case 'joined':
      return { label: 'View', variant: 'gray', disabled: false };
    case 'won':
    case 'lost':
    case 'pending':
      return { label: 'Results', variant: 'gray', disabled: false };
    default:
      return { label: 'Join', variant: 'blue', disabled: false };
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
      className="h-12 w-32"
      disabled={disabled}
      onClick={() => onClick?.(tournament)}
      enableHoverSound
      enableClickSound
    >
      <span className="font-pixel-klein text-base font-bold">{label}</span>
    </Button>
  );
}
