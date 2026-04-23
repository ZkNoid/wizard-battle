'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMinaAppkit } from 'mina-appkit';
import * as tournamentApi from '@/lib/services/tournament-api';
import type { ITournament } from '@/lib/types/ITournament';

// mina-appkit already declares Window.mina as MinaProvider, which only exposes
// account/network helpers.  sendTransaction is an Auro-specific extension that
// is not part of that interface, so we define a narrow local type and cast at
// the call-site rather than re-declaring the global (which would conflict).
interface AuroWithSign {
  sendTransaction: (params: {
    transaction: unknown;
    feePayer?: { fee?: string; memo?: string };
  }) => Promise<unknown>;
}

export type BuyTicketStatus =
  | 'idle'
  | 'submitting' // POST buy-ticket in flight
  | 'queued' // backend queued the op
  | 'proving' // backend generating ZK proof
  | 'awaiting-signature' // unsigned tx arrived, about to ask wallet
  | 'signing' // wallet dialog open
  | 'broadcasting' // POST submit-tx in flight
  | 'confirmed'
  | 'failed';

const TERMINAL_STATUSES: BuyTicketStatus[] = ['idle', 'confirmed', 'failed'];

export const BUY_TICKET_STATUS_LABEL: Record<BuyTicketStatus, string> = {
  idle: '',
  submitting: 'Submitting request…',
  queued: 'Transaction queued…',
  proving: 'Generating ZK proof…',
  'awaiting-signature': 'Waiting for signature…',
  signing: 'Please sign in your wallet…',
  broadcasting: 'Broadcasting transaction…',
  confirmed: 'Transaction confirmed!',
  failed: 'Transaction failed',
};

export interface UseBuyTicketReturn {
  status: BuyTicketStatus;
  txHash: string | null;
  error: string | null;
  isLoading: boolean;
  buyTicket: (tournament: ITournament) => Promise<void>;
  reset: () => void;
}

export function useBuyTicket(): UseBuyTicketReturn {
  const { address } = useMinaAppkit();
  const [status, setStatus] = useState<BuyTicketStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sseCleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

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
    setStatus('idle');
    setTxHash(null);
    setError(null);
  }, [closeStream]);

  const buyTicket = useCallback(
    async (tournament: ITournament) => {
      if (!address) {
        setError('Wallet not connected');
        setStatus('failed');
        return;
      }

      if (!TERMINAL_STATUSES.includes(status)) return;

      closeStream();
      setError(null);
      setTxHash(null);
      setStatus('submitting');

      try {
        // ── Step 1: queue the operation on the backend ──────────────────────
        const { operationId } = await tournamentApi.buyTicket(
          tournament.id,
          address
        );

        if (!mountedRef.current) return;
        setStatus('queued');

        // ── Step 2: subscribe to SSE updates ────────────────────────────────
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
                    transaction: parsedTx,
                    feePayer: { fee: '0.1', memo: 'Buy tournament ticket' },
                  });

                  if (!mountedRef.current) return;
                  setStatus('broadcasting');

                  const { txHash: hash } =
                    await tournamentApi.submitTransaction(
                      tournament.id,
                      operationId,
                      JSON.stringify(signResult)
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
            setStatus((prev) => {
              if (prev === 'confirmed' || prev === 'failed') return prev;
              setError('Lost connection to server. Please try again.');
              return 'failed';
            });
          }
        );

        sseCleanupRef.current = cleanup;
      } catch (err) {
        if (!mountedRef.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to initiate ticket purchase';
        setError(msg);
        setStatus('failed');
      }
    },
    [address, status, closeStream]
  );

  const isLoading = !TERMINAL_STATUSES.includes(status);

  return { status, txHash, error, isLoading, buyTicket, reset };
}
