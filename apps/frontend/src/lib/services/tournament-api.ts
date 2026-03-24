const BACKEND_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? `http://${process.env.NEXT_PUBLIC_API_URL}`
    : 'http://localhost:3030';

const TOURNAMENT_BASE = `${BACKEND_URL}/tournament`;

export interface TournamentResponse {
  tournamentId: string;
  status: string;
  registrationStartSlot: number;
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

/**
 * Opens an SSE stream for the given operation.
 * Returns a cleanup function that closes the connection.
 */
export function streamOperation(
  tournamentId: string,
  operationId: string,
  onEvent: (event: OperationStreamEvent) => void,
  onError?: () => void
): () => void {
  const url = `${TOURNAMENT_BASE}/${tournamentId}/operation/${operationId}/stream`;
  const es = new EventSource(url);

  es.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data as string) as OperationStreamEvent;
      onEvent(data);
    } catch {
      // ignore malformed frames
    }
  };

  es.onerror = () => {
    onError?.();
    es.close();
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
