import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { createMock } from '@golevelup/ts-jest';
import { Model, Types } from 'mongoose';
import {
  TournamentStateService,
  AddPendingOperationDto,
} from './tournament-state.service.js';
import { MerkleService } from '../merkle/merkle.service.js';
import { RedisService } from '../../../redis/redis.service.js';
import { OperationEventsService } from '../events/operation-events.service.js';
import { TournamentVerifiedMutationsService } from './tournament-verified-mutations.service.js';
import {
  Tournament,
  TournamentDocument,
  TournamentStatus,
} from '../../schemas/tournament.schema.js';
import {
  PendingOperation,
  PendingOperationDocument,
  OperationType,
  OperationStatus,
} from '../../schemas/pending-operation.schema.js';

describe('TournamentStateService', () => {
  let testingModule: TestingModule;
  let service: TournamentStateService;
  let tournamentModel: Model<TournamentDocument>;
  let pendingOpModel: Model<PendingOperationDocument>;
  let merkleService: MerkleService;
  let redisService: RedisService;
  let operationEvents: OperationEventsService;

  const mockTournament: Partial<TournamentDocument> = {
    tournamentId: '1',
    verified: {
      status: TournamentStatus.Battle,
      battleStartSlot: 500,
      battleEndSlot: 1000,
      ticketPrice: '1000000000',
      prize1Percent: 5000,
      prize2Percent: 3000,
      prize3Percent: 2000,
      prizePool: '5000000000',
      participantCount: 5,
      participantsRoot: '123456',
      winnersRoot: '0',
      lastVerifiedBlock: 100,
    },
    participants: new Map([
      ['B62qPlayer1', true],
      ['B62qPlayer2', true],
      ['B62qPlayer3', true],
      ['B62qPlayer4', true],
      ['B62qPlayer5', true],
    ]),
    tournamentsRoot: '789',
    save: jest.fn().mockResolvedValue(this),
  };

  const mockPendingOps: Partial<PendingOperationDocument>[] = [
    {
      _id: new Types.ObjectId(),
      tournamentId: '1',
      type: OperationType.BuyTicket,
      playerPubKey: 'B62qPending1',
      status: OperationStatus.Queued,
      retryCount: 0,
    },
    {
      _id: new Types.ObjectId(),
      tournamentId: '1',
      type: OperationType.BuyTicket,
      playerPubKey: 'B62qPending2',
      status: OperationStatus.Proving,
      retryCount: 0,
    },
  ];

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        TournamentStateService,
        MerkleService,
        {
          provide: getModelToken(Tournament.name),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            updateOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(PendingOperation.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findOneAndUpdate: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue({
              publish: jest.fn().mockResolvedValue(1),
            }),
          },
        },
        {
          provide: OperationEventsService,
          useValue: { emit: jest.fn() },
        },
        {
          provide: TournamentVerifiedMutationsService,
          useValue: createMock<TournamentVerifiedMutationsService>(),
        },
      ],
    }).compile();

    service = testingModule.get<TournamentStateService>(TournamentStateService);
    tournamentModel = testingModule.get<Model<TournamentDocument>>(
      getModelToken(Tournament.name)
    );
    pendingOpModel = testingModule.get<Model<PendingOperationDocument>>(
      getModelToken(PendingOperation.name)
    );
    merkleService = testingModule.get<MerkleService>(MerkleService);
    redisService = testingModule.get<RedisService>(RedisService);
    operationEvents = testingModule.get<OperationEventsService>(
      OperationEventsService
    );
  });

  describe('getVerifiedState', () => {
    it('should return tournament from database', async () => {
      jest.spyOn(tournamentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTournament),
      } as any);

      const result = await service.getVerifiedState('1');

      expect(result).toEqual(mockTournament);
      expect(tournamentModel.findOne).toHaveBeenCalledWith({
        tournamentId: '1',
      });
    });

    it('should return null for non-existent tournament', async () => {
      jest.spyOn(tournamentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.getVerifiedState('999');

      expect(result).toBeNull();
    });
  });

  describe('getOptimisticState', () => {
    it('should calculate optimistic state with pending operations', async () => {
      jest.spyOn(tournamentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTournament),
      } as any);

      jest.spyOn(pendingOpModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPendingOps),
        }),
      } as any);

      const result = await service.getOptimisticState('1');

      expect(result).not.toBeNull();
      expect(result!.participantCount).toBe(7);
      expect(result!.registeredPlayers).toHaveLength(5);
      expect(result!.pendingPlayers).toHaveLength(2);
      expect(result!.pendingPlayers).toContain('B62qPending1');
      expect(result!.pendingPlayers).toContain('B62qPending2');
    });

    it('should return null for non-existent tournament', async () => {
      jest.spyOn(tournamentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.getOptimisticState('999');

      expect(result).toBeNull();
    });

    it('should calculate correct prize pool with pending tickets', async () => {
      jest.spyOn(tournamentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTournament),
      } as any);

      jest.spyOn(pendingOpModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPendingOps),
        }),
      } as any);

      const result = await service.getOptimisticState('1');

      const ticketPrice = BigInt('1000000000');
      const platformFee = (ticketPrice * BigInt(500)) / BigInt(10000);
      const prizeContribution = ticketPrice - platformFee;
      const expectedPool = BigInt('5000000000') + prizeContribution * BigInt(2);

      expect(result!.prizePool).toBe(expectedPool.toString());
    });
  });

  describe('getPendingOperations', () => {
    it('should return pending operations for tournament', async () => {
      jest.spyOn(pendingOpModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockPendingOps),
        }),
      } as any);

      const result = await service.getPendingOperations('1');

      expect(result).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      jest.spyOn(pendingOpModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockPendingOps[0]]),
        }),
      } as any);

      const result = await service.getPendingOperations('1', [
        OperationStatus.Queued,
      ]);

      expect(result).toHaveLength(1);
      expect(pendingOpModel.find).toHaveBeenCalledWith({
        tournamentId: '1',
        status: { $in: [OperationStatus.Queued] },
      });
    });
  });

  describe('addPendingOperation', () => {
    it('should reject duplicate pending operation', async () => {
      jest.spyOn(tournamentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTournament),
      } as any);

      const dupErr = Object.assign(new Error('E11000 duplicate key'), {
        code: 11000,
      });
      jest.spyOn(pendingOpModel, 'create').mockRejectedValue(dupErr);

      const dto: AddPendingOperationDto = {
        tournamentId: '1',
        type: OperationType.BuyTicket,
        playerPubKey: 'B62qPending1',
      };

      await expect(service.addPendingOperation(dto)).rejects.toThrow(
        'already has a pending'
      );
    });

    it('should reject if player already registered', async () => {
      jest.spyOn(pendingOpModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(tournamentModel, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTournament),
      } as any);

      const dto: AddPendingOperationDto = {
        tournamentId: '1',
        type: OperationType.BuyTicket,
        playerPubKey: 'B62qPlayer1',
      };

      await expect(service.addPendingOperation(dto)).rejects.toThrow(
        'already registered'
      );
    });
  });

  describe('failOperationIfAwaitingBroadcast', () => {
    it('returns true and emits when a submitted op without txHash is updated', async () => {
      const opId = new Types.ObjectId();
      const updated = {
        _id: opId,
        tournamentId: '1',
        status: OperationStatus.Failed,
        error: 'broadcast_failed: x',
        unsignedTxJson: '{}',
        updatedAt: new Date(),
      };
      jest.spyOn(pendingOpModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      } as any);

      const result = await service.failOperationIfAwaitingBroadcast(
        opId.toString(),
        'broadcast_failed: x'
      );

      expect(result).toBe(true);
      expect(operationEvents.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          operationId: opId.toString(),
          status: OperationStatus.Failed,
          error: 'broadcast_failed: x',
        })
      );
    });

    it('returns false when no matching document', async () => {
      jest.spyOn(pendingOpModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.failOperationIfAwaitingBroadcast(
        new Types.ObjectId().toString(),
        'err'
      );

      expect(result).toBe(false);
    });
  });

  describe('abandonPlayerOperation', () => {
    it('returns wrong_player when pubkey does not match', async () => {
      const opId = new Types.ObjectId();
      jest.spyOn(pendingOpModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: opId,
          tournamentId: '1',
          playerPubKey: 'B62qExpected',
          type: OperationType.BuyTicket,
          status: OperationStatus.Submitted,
        }),
      } as any);

      const result = await service.abandonPlayerOperation(
        '1',
        opId.toString(),
        'B62qOther'
      );

      expect(result).toEqual({ ok: false, reason: 'wrong_player' });
      expect(pendingOpModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('returns ok true when atomic update succeeds', async () => {
      const opId = new Types.ObjectId();
      jest.spyOn(pendingOpModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: opId,
          tournamentId: '1',
          playerPubKey: 'B62qP',
          type: OperationType.BuyTicket,
          status: OperationStatus.Submitted,
        }),
      } as any);
      jest.spyOn(pendingOpModel, 'findOneAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: opId,
          tournamentId: '1',
          status: OperationStatus.Failed,
          error: 'abandoned_by_client',
          updatedAt: new Date(),
        }),
      } as any);

      const result = await service.abandonPlayerOperation(
        '1',
        opId.toString(),
        'B62qP'
      );

      expect(result).toEqual({ ok: true });
      expect(operationEvents.emit).toHaveBeenCalled();
    });
  });

  describe('expireStaleSubmittedAwaitingSignature', () => {
    it('calls failOperationIfAwaitingBroadcast for each stale candidate', async () => {
      const id1 = new Types.ObjectId();
      const id2 = new Types.ObjectId();
      jest.spyOn(pendingOpModel, 'find').mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([{ _id: id1 }, { _id: id2 }]),
        }),
      } as any);

      const spy = jest
        .spyOn(service, 'failOperationIfAwaitingBroadcast')
        .mockResolvedValue(true);

      const count = await service.expireStaleSubmittedAwaitingSignature(60_000);

      expect(count).toBe(2);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(
        id1.toString(),
        'abandoned_awaiting_signature'
      );
      expect(spy).toHaveBeenCalledWith(
        id2.toString(),
        'abandoned_awaiting_signature'
      );
    });
  });
});
