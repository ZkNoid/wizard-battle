import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { PrivateKey } from 'o1js';
import { TournamentVerifiedMutationsService } from './tournament-verified-mutations.service.js';
import { MerkleService } from '../merkle/merkle.service.js';
import {
  Tournament,
  TournamentDocument,
  TournamentStatus,
} from '../../schemas/tournament.schema.js';
import {
  PendingOperationDocument,
  OperationType,
  OperationStatus,
} from '../../schemas/pending-operation.schema.js';

/**
 * The mutations service is the off-chain mirror of TournamentManager's
 * `prizePool` / `sponsorContribution` / status transitions. These tests
 * pin the contract-mirroring math so future drift is caught immediately —
 * a stale leaf hash here permanently bricks a tournament's proof flow.
 */
// Generate fresh, valid Mina pubkeys so the MerkleService PublicKey.fromBase58
// calls succeed under whichever o1js version the workspace happens to pin.
const PUBKEY_A = PrivateKey.random().toPublicKey().toBase58();
const PUBKEY_B = PrivateKey.random().toPublicKey().toBase58();

describe('TournamentVerifiedMutationsService', () => {
  let service: TournamentVerifiedMutationsService;
  let tournamentModel: Model<TournamentDocument>;

  const buildTournament = (
    overrides: Partial<TournamentDocument['verified']> = {},
    extra: Partial<{
      participants: Map<string, boolean>;
      winners: Map<string, { prizeAmount: string; claimed: boolean }>;
    }> = {}
  ): Partial<TournamentDocument> & { save: jest.Mock } => {
    const verified: TournamentDocument['verified'] = {
      status: TournamentStatus.Battle,
      battleStartSlot: 0,
      battleEndSlot: 1000,
      claimDeadlineSlot: 21000,
      ticketPrice: '1000000000',
      feePercent: 500,
      prizePercents: [2500, 1500, 1000, 1000, 1000, 700, 700, 700, 500, 400],
      prizePool: '0',
      sponsorContribution: '0',
      participantCount: 0,
      participantsRoot: '0',
      winnersRoot: '0',
      lastVerifiedBlock: 0,
      ...overrides,
    } as TournamentDocument['verified'];

    return {
      tournamentId: '1',
      verified,
      participants: extra.participants ?? new Map<string, boolean>(),
      winners:
        extra.winners ??
        new Map<string, { prizeAmount: string; claimed: boolean }>(),
      tournamentsRoot: '0',
      save: jest.fn().mockResolvedValue(undefined),
    };
  };

  const mockFindOne = (doc: ReturnType<typeof buildTournament> | null) => {
    jest.spyOn(tournamentModel, 'findOne').mockReturnValue({
      exec: jest.fn().mockResolvedValue(doc),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentVerifiedMutationsService,
        MerkleService,
        {
          provide: getModelToken(Tournament.name),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TournamentVerifiedMutationsService>(
      TournamentVerifiedMutationsService
    );
    tournamentModel = module.get<Model<TournamentDocument>>(
      getModelToken(Tournament.name)
    );
  });

  describe('applySponsorFundToVerified', () => {
    it('increments prizePool and sponsorContribution by the funded amount', async () => {
      const doc = buildTournament({
        prizePool: '5000000000',
        sponsorContribution: '1000000000',
      });
      mockFindOne(doc);

      await service.applySponsorFundToVerified('1', '2000000000');

      expect(doc.verified.prizePool).toBe('7000000000');
      expect(doc.verified.sponsorContribution).toBe('3000000000');
      expect(doc.save).toHaveBeenCalled();
    });

    it('treats missing sponsorContribution as zero', async () => {
      const doc = buildTournament({
        prizePool: '0',
        sponsorContribution: undefined as unknown as string,
      });
      mockFindOne(doc);

      await service.applySponsorFundToVerified('1', '4242');

      expect(doc.verified.sponsorContribution).toBe('4242');
      expect(doc.verified.prizePool).toBe('4242');
    });

    it('rejects non-positive amounts so we never silently no-op', async () => {
      mockFindOne(buildTournament());

      await expect(
        service.applySponsorFundToVerified('1', '0')
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.applySponsorFundToVerified('1', '-100')
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-numeric amounts', async () => {
      mockFindOne(buildTournament());

      await expect(
        service.applySponsorFundToVerified('1', 'not-a-number')
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('applyClaimPrizeToVerified', () => {
    it('marks the winner claimed and decrements prizePool by the prize amount', async () => {
      const winners = new Map([
        [PUBKEY_A, { prizeAmount: '2000000000', claimed: false }],
      ]);
      const doc = buildTournament(
        {
          status: TournamentStatus.Claiming,
          prizePool: '10000000000',
        },
        { winners }
      );
      mockFindOne(doc);

      await service.applyClaimPrizeToVerified('1', PUBKEY_A);

      expect(doc.winners.get(PUBKEY_A)!.claimed).toBe(true);
      expect(doc.verified.prizePool).toBe('8000000000');
    });

    it('throws when the prize would underflow the pool — guards against drift bugs', async () => {
      const winners = new Map([
        [PUBKEY_A, { prizeAmount: '5000000000', claimed: false }],
      ]);
      const doc = buildTournament(
        {
          status: TournamentStatus.Claiming,
          prizePool: '1000000000', // less than the prize
        },
        { winners }
      );
      mockFindOne(doc);

      await expect(
        service.applyClaimPrizeToVerified('1', PUBKEY_A)
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('is idempotent when claim already applied', async () => {
      const winners = new Map([
        [PUBKEY_A, { prizeAmount: '1000', claimed: true }],
      ]);
      const doc = buildTournament(
        {
          status: TournamentStatus.Claiming,
          prizePool: '5000',
        },
        { winners }
      );
      mockFindOne(doc);

      await service.applyClaimPrizeToVerified('1', PUBKEY_A);

      expect(doc.verified.prizePool).toBe('5000');
      expect(doc.save).not.toHaveBeenCalled();
    });
  });

  describe('applyFinalizeTournamentToVerified', () => {
    const buildOp = (
      finalizeWinners: { publicKey: string; prizeAmount: string; place: number }[]
    ): PendingOperationDocument => {
      return {
        _id: new Types.ObjectId(),
        tournamentId: '1',
        type: OperationType.FinalizeTournament,
        playerPubKey: 'B62qAdmin',
        status: OperationStatus.Submitted,
        retryCount: 0,
        finalizeWinners,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    };

    it('sets prizePool to totalAllocated, mirroring contract refund', async () => {
      const doc = buildTournament({
        prizePool: '10000000000', // 10 MINA available
      });
      mockFindOne(doc);

      await service.applyFinalizeTournamentToVerified(
        buildOp([
          { publicKey: PUBKEY_A, prizeAmount: '3000000000', place: 1 },
          { publicKey: PUBKEY_B, prizeAmount: '1000000000', place: 2 },
        ])
      );

      // 10 MINA pool, 4 MINA allocated → leaf prizePool = 4 MINA;
      // contract sends remaining 6 MINA to admin in the same tx.
      expect(doc.verified.prizePool).toBe('4000000000');
      expect(doc.verified.status).toBe(TournamentStatus.Claiming);
      expect(doc.winners.size).toBe(2);
    });

    it('rejects when allocations exceed the pool', async () => {
      const doc = buildTournament({ prizePool: '1000' });
      mockFindOne(doc);

      await expect(
        service.applyFinalizeTournamentToVerified(
          buildOp([
            { publicKey: PUBKEY_A, prizeAmount: '600', place: 1 },
            { publicKey: PUBKEY_B, prizeAmount: '500', place: 2 },
          ])
        )
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(doc.save).not.toHaveBeenCalled();
    });

    it('is idempotent when already finalized', async () => {
      const doc = buildTournament({
        status: TournamentStatus.Claiming,
        prizePool: '1000',
      });
      mockFindOne(doc);

      await service.applyFinalizeTournamentToVerified(
        buildOp([{ publicKey: PUBKEY_A, prizeAmount: '100', place: 1 }])
      );

      // Pool unchanged because we early-returned on the idempotency guard.
      expect(doc.verified.prizePool).toBe('1000');
      expect(doc.save).not.toHaveBeenCalled();
    });
  });

  describe('applyRecoverUnclaimedToVerified', () => {
    it('transitions Claiming → Settled and zeroes prizePool', async () => {
      const doc = buildTournament({
        status: TournamentStatus.Claiming,
        prizePool: '5000000000',
      });
      mockFindOne(doc);

      await service.applyRecoverUnclaimedToVerified('1');

      expect(doc.verified.status).toBe(TournamentStatus.Settled);
      expect(doc.verified.prizePool).toBe('0');
    });

    it('is idempotent when already settled', async () => {
      const doc = buildTournament({
        status: TournamentStatus.Settled,
        prizePool: '0',
      });
      mockFindOne(doc);

      await service.applyRecoverUnclaimedToVerified('1');

      expect(doc.save).not.toHaveBeenCalled();
    });

    it('rejects from invalid statuses to surface ordering bugs in the queue', async () => {
      const doc = buildTournament({
        status: TournamentStatus.Battle,
        prizePool: '1',
      });
      mockFindOne(doc);

      await expect(
        service.applyRecoverUnclaimedToVerified('1')
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
