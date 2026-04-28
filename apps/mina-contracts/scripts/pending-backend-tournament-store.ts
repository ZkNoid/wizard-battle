/**
 * Persist tournament POST payloads when backend registration fails or when tx `wait()`
 * errors after `send()` (tx may still confirm — root in payload is optimistic until verified).
 * Used by create-tournament.ts and retry-pending-backend-tournaments.ts.
 */
import fs from 'node:fs';
import path from 'node:path';

export const PENDING_BACKEND_VERSION = 1 as const;

export type TournamentBackendPayload = {
  tournamentId: string;
  ticketPrice: string;
  prize1Percent: number;
  prize2Percent: number;
  prize3Percent: number;
  registrationStartSlot: number;
  battleStartSlot: number;
  battleEndSlot: number;
  tournamentsRoot: string;
  txHash: string;
  title: string;
  imageUrl: string;
};

export type PendingBackendEnvelope = {
  version: typeof PENDING_BACKEND_VERSION;
  savedAt: string;
  payload: TournamentBackendPayload;
  /** Set when create-tournament's wait() threw; verify tx on-chain before trusting tournamentsRoot */
  confirmationUncertain?: boolean;
};

export type SavePendingBackendOptions = {
  confirmationUncertain?: boolean;
};

/** Relative to apps/mina-contracts cwd when scripts run via pnpm from that package */
export function getPendingBackendDir(): string {
  return path.join(process.cwd(), 'keys', 'tournament', 'pending-backend');
}

export function pendingBackendFilePath(tournamentId: string): string {
  return path.join(
    getPendingBackendDir(),
    `tournament-${tournamentId}-pending.json`
  );
}

export function savePendingBackendPayload(
  payload: TournamentBackendPayload,
  options?: SavePendingBackendOptions
): string {
  const dir = getPendingBackendDir();
  fs.mkdirSync(dir, { recursive: true });

  const envelope: PendingBackendEnvelope = {
    version: PENDING_BACKEND_VERSION,
    savedAt: new Date().toISOString(),
    payload,
    ...(options?.confirmationUncertain
      ? { confirmationUncertain: true }
      : {}),
  };

  const filePath = pendingBackendFilePath(payload.tournamentId);
  fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2), 'utf8');
  return filePath;
}

export function listPendingBackendFiles(): string[] {
  const dir = getPendingBackendDir();
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('-pending.json'))
    .map((name) => path.join(dir, name))
    .sort();
}

export function readPendingBackendEnvelope(
  filePath: string
): PendingBackendEnvelope {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as Partial<PendingBackendEnvelope>;

  if (parsed.version !== PENDING_BACKEND_VERSION || !parsed.payload) {
    throw new Error(`Invalid pending envelope: ${filePath}`);
  }
  return parsed as PendingBackendEnvelope;
}

export function removePendingBackendFile(filePath: string): void {
  fs.unlinkSync(filePath);
}
