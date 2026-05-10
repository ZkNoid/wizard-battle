'use client';

import { TournamentDetailsInfo } from './TournamentDetailsInfo';
import { TournamentDetailsLeaderboard } from './TournamentDetailsLeaderboard';
import type { ITournament } from '@/lib/types/ITournament';

interface TournamentDetailsFormProps {
  tournament: ITournament;
  onJoin?: (tournament: ITournament) => void;
  onClaim?: (tournament: ITournament) => void;
  onOpen?: (tournament: ITournament) => void;
}

export function TournamentDetailsForm({
  tournament,
  onJoin,
  onClaim,
  onOpen,
}: TournamentDetailsFormProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-row gap-3">
      {/* Col 1 — info (~38%) */}
      <div className="w-[38%] shrink-0">
        <TournamentDetailsInfo
          tournament={tournament}
          onJoin={onJoin}
          onClaim={onClaim}
          onOpen={onOpen}
        />
      </div>

      {/* Col 2 — leaderboard (~62%) */}
      <div className="flex min-h-0 min-w-0 flex-1">
        <TournamentDetailsLeaderboard tournament={tournament} />
      </div>
    </div>
  );
}
