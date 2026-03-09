'use client';

import { Button } from '../shared/Button';

export interface ITournament {
  id: string;
  title: string;
  prizePool: number;
  entryFee: number;
  participants: number;
  maxParticipants: number;
  status: 'upcoming' | 'active' | 'ended';
  startDate: string;
}

interface TournamentsListItemProps {
  tournament: ITournament;
  onClick?: (tournament: ITournament) => void;
}

const STATUS_LABEL: Record<ITournament['status'], string> = {
  upcoming: 'Upcoming',
  active: 'Active',
  ended: 'Ended',
};

const STATUS_COLOR: Record<ITournament['status'], string> = {
  upcoming: 'text-yellow-400',
  active: 'text-green-400',
  ended: 'text-main-gray/50',
};

export function TournamentsListItem({
  tournament,
  onClick,
}: TournamentsListItemProps) {
  return (
    <div className="font-pixel text-main-gray flex w-full flex-row items-center justify-between gap-4 border border-main-gray/20 bg-main-gray/5 px-5 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-base font-bold">{tournament.title}</span>
        <span className="font-pixel-klein text-main-gray/60 text-sm">
          {tournament.startDate}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="font-pixel-klein text-main-gray/60 text-xs">Prize pool</span>
        <span className="text-sm font-bold">{tournament.prizePool.toLocaleString()}</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="font-pixel-klein text-main-gray/60 text-xs">Entry fee</span>
        <span className="text-sm font-bold">{tournament.entryFee.toLocaleString()}</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="font-pixel-klein text-main-gray/60 text-xs">Players</span>
        <span className="text-sm font-bold">
          {tournament.participants} / {tournament.maxParticipants}
        </span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="font-pixel-klein text-main-gray/60 text-xs">Status</span>
        <span className={`text-sm font-bold ${STATUS_COLOR[tournament.status]}`}>
          {STATUS_LABEL[tournament.status]}
        </span>
      </div>

      <Button
        variant="gray"
        className="h-10 w-28 shrink-0"
        onClick={() => onClick?.(tournament)}
        enableHoverSound
        enableClickSound
      >
        <span className="font-pixel-klein text-base font-bold">Join</span>
      </Button>
    </div>
  );
}
