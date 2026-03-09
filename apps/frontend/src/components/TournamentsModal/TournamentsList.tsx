'use client';

import Image from 'next/image';
import { useState } from 'react';
import { TournamentsListItem, type ITournament } from './TournamentsListItem';

const PAGE_SIZE = 6;

interface TournamentsListProps {
  tournaments: ITournament[];
  onItemClick?: (tournament: ITournament) => void;
}

export function TournamentsList({ tournaments, onItemClick }: TournamentsListProps) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(tournaments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = tournaments.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {pageItems.length === 0 ? (
          <div className="font-pixel text-main-gray/60 flex h-40 items-center justify-center text-base">
            No tournaments available
          </div>
        ) : (
          pageItems.map((tournament) => (
            <TournamentsListItem
              key={tournament.id}
              tournament={tournament}
              onClick={onItemClick}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-center gap-5">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage === 0}
          className="transition-transform duration-300 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Image
            src="/inventory/arrow-left.png"
            width={36}
            height={48}
            alt="previous-page"
            className="h-12 w-16 object-contain object-center"
          />
        </button>

        <span className="font-pixel text-main-gray text-xl font-bold">
          {safePage + 1} / {totalPages}
        </span>

        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={safePage === totalPages - 1}
          className="transition-transform duration-300 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Image
            src="/inventory/arrow-right.png"
            width={36}
            height={48}
            alt="next-page"
            className="h-12 w-16 object-contain object-center"
          />
        </button>
      </div>
    </div>
  );
}
