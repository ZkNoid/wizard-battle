'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMinaAppkit } from 'mina-appkit';
import * as tournamentApi from '@/lib/services/tournament-api';
import type { ITournament } from '@/lib/types/ITournament';

// Mirror of useBuyTicket's wallet typing — Auro `sendTransaction({ onlySign })`
// is not part of mina-appkit's MinaProvider declaration so we narrow locally
// and cast at the call-site rather than augment the global window typing.
interface AuroSignedZkappCommand {
  signedData: string;
}

interface AuroProviderError {
  message: string;
  code: number;
  data?: unknown;
}

interface AuroWithSign {
  sendTransaction: (params: {
    onlySign?: boolean;
    transaction: unknown;
    feePayer?: { fee?: string; memo?: string };
  }) => Promise<AuroSignedZkappCommand | AuroProviderError>;
}

export type ClaimPrizeStatus =
  | 'idle'
  | 'submitting'
  | 'queued'
  | 'proving'
  | 'awaiting-signature'
  | 'signing'
  | 'broadcasting'
  | 'confirmed'
  | 'failed';

const TERMINAL_STATUSES: ClaimPrizeStatus[] = ['idle', 'confirmed', 'failed'];

export const CLAIM_PRIZE_STATUS_LABEL: Record<ClaimPrizeStatus, string> = {
  idle: '',
  submitting: 'Submitting claim…',
  queued: 'Claim queued…',
  proving: 'Generating ZK proof…',
  'awaiting-signature': 'Waiting for signature…',
  signing: 'Please sign in your wallet…',
  broadcasting: 'Broadcasting transaction…',
  confirmed: 'Prize claimed!',
  failed: 'Claim failed',
};

export interface UseClaimPrizeReturn {
  status: ClaimPrizeStatus;
  txHash: string | null;
  error: string | null;
  isLoading: boolean;
  claimPrize: (tournament: ITournament) => Promise<void>;
  reset: () => void;
}

/**
 * Drives the on-chain "claim prize" flow for tournament winners.
 *
 * Mirrors {@link useBuyTicket} — both queue a backend operation that produces
 * an unsigned ZK transaction, surface progress via SSE, request a wallet
 * signature, then POST the signed payload back. The contract method invoked
 * server-side is `TournamentManager.claimPrize` (see
 * `apps/mina-contracts/src/TournamentManager.ts`).
 */
export function useClaimPrize(): UseClaimPrizeReturn {
  const { address } = useMinaAppkit();
  const [status, setStatus] = useState<ClaimPrizeStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sseCleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  /** Prevents a second wallet prompt when SSE replays the same `submitted` payload. */
  const submittedSigningStartedRef = useRef(false);

  const closeStream = useCallback(() => {
    sseCleanupRef.current?.();
    sseCleanupRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sseCleanupRef.current?.();
      sseCleanupRef.current = null;
    };
  }, []);

  const reset = useCallback(() => {
    closeStream();
    submittedSigningStartedRef.current = false;
    setStatus('idle');
    setTxHash(null);
    setError(null);
  }, [closeStream]);

  const claimPrize = useCallback(
    async (tournament: ITournament) => {
      if (!address) {
        setError('Wallet not connected');
        setStatus('failed');
        return;
      }

      if (!TERMINAL_STATUSES.includes(status)) return;

      closeStream();
      submittedSigningStartedRef.current = false;
      setError(null);
      setTxHash(null);
      setStatus('submitting');

      let operationIdForAbandon: string | null = null;

      try {
        const { operationId } = await tournamentApi.claimPrize(
          tournament.id,
          address
        );

        operationIdForAbandon = operationId;

        if (!mountedRef.current) return;
        setStatus('queued');

        const cleanup = tournamentApi.streamOperation(
          tournament.id,
          operationId,
          async (event) => {
            if (!mountedRef.current) return;

            switch (event.status) {
              case 'queued':
                setStatus('queued');
                break;

              case 'proving':
                setStatus('proving');
                break;

              case 'submitted': {
                if (!event.unsignedTxJson) break;
                if (submittedSigningStartedRef.current) break;
                submittedSigningStartedRef.current = true;

                setStatus('awaiting-signature');

                try {
                  setStatus('signing');

                  const mina = window.mina as
                    | (AuroWithSign & typeof window.mina)
                    | undefined;
                  if (!mina) {
                    throw new Error(
                      'Auro wallet not found. Please install the Auro extension.'
                    );
                  }

                  let parsedTx: unknown;
                  try {
                    parsedTx = JSON.parse(event.unsignedTxJson) as unknown;
                  } catch {
                    throw new Error(
                      'Received malformed transaction from server'
                    );
                  }

                  const signResult = await mina.sendTransaction({
                    onlySign: true,
                    transaction: parsedTx,
                    feePayer: { fee: '0.1', memo: 'Claim tournament prize' },
                  });

                  if (!mountedRef.current) return;

                  if (
                    signResult &&
                    typeof signResult === 'object' &&
                    'code' in signResult
                  ) {
                    const err = signResult as AuroProviderError;
                    throw new Error(
                      err.message ?? `Wallet error (code ${err.code})`
                    );
                  }

                  if (
                    !signResult ||
                    typeof signResult !== 'object' ||
                    !('signedData' in signResult)
                  ) {
                    throw new Error(
                      'Wallet did not return signed transaction data (expected signedData)'
                    );
                  }

                  const { signedData } = signResult as AuroSignedZkappCommand;
                  if (
                    typeof signedData !== 'string' ||
                    signedData.trim() === ''
                  ) {
                    throw new Error(
                      'Wallet signedData must be a non-empty string (Auro JSON text of the zkApp command)'
                    );
                  }

                  setStatus('broadcasting');

                  const { txHash: hash } =
                    await tournamentApi.submitTransaction(
                      tournament.id,
                      operationId,
                      signedData
                    );

                  if (!mountedRef.current) return;
                  setTxHash(hash);
                } catch (err) {
                  if (!mountedRef.current) return;
                  const msg =
                    err instanceof Error
                      ? err.message
                      : 'Failed to sign or broadcast transaction';
                  setError(msg);
                  setStatus('failed');
                  closeStream();
                  try {
                    await tournamentApi.abandonOperation(
                      tournament.id,
                      operationId,
                      address
                    );
                  } catch {
                    // Backend may already have failed the op; ignore.
                  }
                }
                break;
              }

              case 'confirmed':
                setStatus('confirmed');
                if (event.txHash) setTxHash(event.txHash);
                closeStream();
                break;

              case 'failed':
                setStatus('failed');
                setError(event.error ?? 'Transaction failed on-chain');
                closeStream();
                break;
            }
          },
          () => {
            if (!mountedRef.current) return;
            // Side-effects must NOT live inside a setState updater because
            // React Strict Mode invokes updaters multiple times.
            setStatus((prev) => {
              if (prev === 'confirmed' || prev === 'failed') return prev;
              return 'failed';
            });
            setError('Lost connection to server. Please try again.');
            if (operationIdForAbandon && address) {
              void tournamentApi
                .abandonOperation(
                  tournament.id,
                  operationIdForAbandon,
                  address
                )
                .catch(() => undefined);
            }
          }
        );

        sseCleanupRef.current = cleanup;
      } catch (err) {
        if (!mountedRef.current) return;
        const msg =
          err instanceof Error ? err.message : 'Failed to initiate claim';
        setError(msg);
        setStatus('failed');
      }
    },
    [address, status, closeStream]
  );

  const isLoading = !TERMINAL_STATUSES.includes(status);

  return { status, txHash, error, isLoading, claimPrize, reset };
}
