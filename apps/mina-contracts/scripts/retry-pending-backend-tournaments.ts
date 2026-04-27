/**
 * POST saved tournament payloads from keys/tournament/pending-backend/ to the backend.
 *
 * Usage:
 *   pnpm --filter mina-contracts run retry-pending-backend-tournaments
 *   pnpm --filter mina-contracts run retry-pending-backend-tournaments -- --dry-run
 *   pnpm --filter mina-contracts run retry-pending-backend-tournaments -- --file keys/tournament/pending-backend/tournament-1-pending.json
 *
 * Environment:
 *   BACKEND_URL (default: http://localhost:3001)
 */
import dotenv from 'dotenv';
dotenv.config();
import path from 'node:path';
import {
  listPendingBackendFiles,
  readPendingBackendEnvelope,
  removePendingBackendFile,
  type TournamentBackendPayload,
} from './pending-backend-tournament-store.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const MAX_RETRIES = 12;
const INITIAL_DELAY_MS = 30_000;
const BACKOFF_MULTIPLIER = 1.5;
const MAX_DELAY_MS = 5 * 60_000;

function parseArgs(argv: string[]): { dryRun: boolean; singleFile: string | null } {
  let dryRun = false;
  let singleFile: string | null = null;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run' || a === '-n') {
      dryRun = true;
    } else if (a === '--file' || a === '-f') {
      singleFile = argv[++i] ?? null;
      if (!singleFile) {
        console.error('--file requires a path');
        process.exit(1);
      }
    }
  }
  return { dryRun, singleFile };
}

async function postPayloadWithRetries(
  payload: TournamentBackendPayload
): Promise<boolean> {
  const body = JSON.stringify(payload);
  let attempt = 0;
  let delayMs = INITIAL_DELAY_MS;

  while (attempt <= MAX_RETRIES) {
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/tournament`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (backendResponse.ok) {
        const result = await backendResponse.json();
        console.log(`  OK: ${result.message ?? 'registered'}`);
        return true;
      }

      const errorBody = await backendResponse.text();

      if (backendResponse.status === 409) {
        if (attempt >= MAX_RETRIES) {
          console.error(
            `  Failed after ${MAX_RETRIES} retries (tx pending): ${errorBody}`
          );
          return false;
        }
        console.log(
          `  Attempt ${attempt + 1}/${MAX_RETRIES}: tx still pending, wait ${Math.round(
            delayMs / 1000
          )}s...`
        );
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs = Math.min(delayMs * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
        attempt++;
        continue;
      }

      console.error(`  HTTP ${backendResponse.status}: ${errorBody}`);
      return false;
    } catch (err) {
      console.error('  Network error:', err);
      if (attempt >= MAX_RETRIES) {
        return false;
      }
      console.log(
        `  Attempt ${attempt + 1}/${MAX_RETRIES}, wait ${Math.round(delayMs / 1000)}s...`
      );
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs = Math.min(delayMs * BACKOFF_MULTIPLIER, MAX_DELAY_MS);
      attempt++;
    }
  }

  return false;
}

async function main() {
  const { dryRun, singleFile } = parseArgs(process.argv);

  console.log('='.repeat(60));
  console.log('Retry pending backend tournament registration');
  console.log('='.repeat(60));
  console.log(`Backend: ${BACKEND_URL}`);
  if (dryRun) {
    console.log('(dry-run: no POST requests, no file changes)\n');
  }

  const files = singleFile
    ? [path.resolve(singleFile)]
    : listPendingBackendFiles();

  if (files.length === 0) {
    console.log('No pending payload files found.');
    process.exit(0);
  }

  let succeeded = 0;
  let failed = 0;

  for (const filePath of files) {
    let envelope;
    try {
      envelope = readPendingBackendEnvelope(filePath);
    } catch (e) {
      console.error(`\n[SKIP] ${filePath}: ${e}`);
      failed++;
      continue;
    }

    const id = envelope.payload.tournamentId;
    console.log(`\n→ Tournament ${id} (${path.basename(filePath)})`);
    console.log(`  savedAt: ${envelope.savedAt}, txHash: ${envelope.payload.txHash}`);

    if (dryRun) {
      console.log('  dry-run: would POST to /tournament');
      continue;
    }

    const ok = await postPayloadWithRetries(envelope.payload);
    if (ok) {
      removePendingBackendFile(filePath);
      console.log(`  Removed pending file: ${filePath}`);
      succeeded++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Done. Succeeded: ${succeeded}, failed: ${failed}`);
  if (!dryRun && failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
