const BACKEND_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:3030';

const TOURNAMENT_BASE = `${BACKEND_URL}/tournament`;

export interface TournamentChainStatusResponse {
  connected: boolean;
  currentSlot: number | null;
  contractAddress: string | null;
  proofGeneratorReady: boolean;
}

export interface TournamentResponseSponsor {
  name: string;
  url?: string;
}

export interface TournamentResponse {
  tournamentId: string;
  status: string;
  battleStartSlot: number;
  battleEndSlot: number;
  ticketPrice: string;
  prize1Percent: number;
  prize2Percent: number;
  prize3Percent: number;
  prizePool: string;
  participantCount: number;
  registeredPlayers: string[];
  pendingPlayers: string[];
  /** Backend display title; UI falls back to a generated label when omitted. */
  title?: string;
  /** Backend image URL; UI falls back to a default asset when omitted. */
  imageUrl?: string;
  /** Human-readable description shown in the tournament details panel. */
  description?: string;
  /** Sponsoring organizations shown in the tournament details panel. */
  sponsors?: TournamentResponseSponsor[];
}

/** Matches backend `ITournamentLeaderboardEntry` (apps/common). */
export interface TournamentLeaderboardEntry {
  place: number;
  walletAddress: string;
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  score: number;
  prize: { type: 'currency'; currency: string; amount: number }[];
}

export interface BuyTicketResponse {
  operationId: string;
  status: string;
  message: string;
}

export interface OperationStreamEvent {
  status: 'queued' | 'proving' | 'submitted' | 'confirmed' | 'failed';
  unsignedTxJson?: string;
  txHash?: string;
  error?: string;
  updatedAt: string;
}

export async function fetchTournamentChainStatus(): Promise<TournamentChainStatusResponse> {
  const res = await fetch(`${TOURNAMENT_BASE}/status`);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<TournamentChainStatusResponse>;
}

export async function fetchAllTournaments(): Promise<TournamentResponse[]> {
  const res = await fetch(TOURNAMENT_BASE);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<TournamentResponse[]>;
}

export async function fetchTournament(
  tournamentId: string
): Promise<TournamentResponse> {
  const res = await fetch(`${TOURNAMENT_BASE}/${tournamentId}`);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<TournamentResponse>;
}

export async function fetchTournamentLeaderboard(
  tournamentId: string
): Promise<TournamentLeaderboardEntry[]> {
  const res = await fetch(`${TOURNAMENT_BASE}/${tournamentId}/leaderboard`);

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<TournamentLeaderboardEntry[]>;
}

export async function buyTicket(
  tournamentId: string,
  playerPubKey: string
): Promise<BuyTicketResponse> {
  const res = await fetch(`${TOURNAMENT_BASE}/${tournamentId}/buy-ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerPubKey }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<BuyTicketResponse>;
}

const SSE_MAX_RETRIES = 3;

/**
 * Opens an SSE stream for the given operation.
 * Tolerates transient connection drops up to SSE_MAX_RETRIES consecutive
 * errors before surfacing the failure.  Async onEvent callbacks are
 * serialized so wallet-signing can't overlap with the next SSE frame.
 * Returns a cleanup function that closes the connection.
 */
export function streamOperation(
  tournamentId: string,
  operationId: string,
  onEvent: (event: OperationStreamEvent) => void | Promise<void>,
  onError?: () => void
): () => void {
  const url = `${TOURNAMENT_BASE}/${tournamentId}/operation/${operationId}/stream`;
  const es = new EventSource(url);
  let consecutiveErrors = 0;
  let processing: Promise<void> = Promise.resolve();

  es.onmessage = (ev) => {
    consecutiveErrors = 0;
    processing = processing.then(async () => {
      try {
        const data = JSON.parse(ev.data as string) as OperationStreamEvent;
        await onEvent(data);
      } catch {
        // ignore malformed frames / handler errors
      }
    });
  };

  es.onerror = () => {
    consecutiveErrors++;
    if (consecutiveErrors >= SSE_MAX_RETRIES) {
      es.close();
      onError?.();
    }
    // otherwise let EventSource auto-reconnect
  };

  return () => es.close();
}

export async function submitTransaction(
  tournamentId: string,
  operationId: string,
  signedTxJson: string
): Promise<{ txHash: string }> {
  const res = await fetch(`${TOURNAMENT_BASE}/${tournamentId}/submit-tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationId, signedTxJson }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<{ txHash: string }>;
}

/**
 * Marks a stuck submitted operation as failed so the player can start buy-ticket again
 * (no on-chain tx yet: wallet rejected, broadcast error, or client disconnect).
 */
export async function abandonOperation(
  tournamentId: string,
  operationId: string,
  playerPubKey: string
): Promise<{ ok: true; status: string }> {
  const res = await fetch(
    `${TOURNAMENT_BASE}/${tournamentId}/operation/${operationId}/abandon`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerPubKey }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (body as { message?: string } | null)?.message ?? `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<{ ok: true; status: string }>;
}
