import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { createMock } from '@golevelup/ts-jest';
import { Model, Types } from 'mongoose';
import {
  TournamentStateService,
  AddPendingOperationDto,
} from './tournament-state.service.js';
import { MerkleService } from './merkle.service.js';
import { RedisService } from '../../redis/redis.service.js';
import {
  Tournament,
  TournamentDocument,
  TournamentStatus,
} from '../schemas/tournament.schema.js';
import {
  PendingOperation,
  PendingOperationDocument,
  OperationType,
  OperationStatus,
} from '../schemas/pending-operation.schema.js';

describe('TournamentStateService', () => {
  let service: TournamentStateService;
  let tournamentModel: Model<TournamentDocument>;
  let pendingOpModel: Model<PendingOperationDocument>;
  let merkleService: MerkleService;
  let redisService: RedisService;

  const mockTournament: Partial<TournamentDocument> = {
    tournamentId: '1',
    verified: {
      status: TournamentStatus.Registration,
      registrationStartSlot: 100,
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
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get<TournamentStateService>(TournamentStateService);
    tournamentModel = module.get<Model<TournamentDocument>>(
      getModelToken(Tournament.name)
    );
    pendingOpModel = module.get<Model<PendingOperationDocument>>(
      getModelToken(PendingOperation.name)
    );
    merkleService = module.get<MerkleService>(MerkleService);
    redisService = module.get<RedisService>(RedisService);
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
      jest
        .spyOn(pendingOpModel, 'findOne')
        .mockResolvedValue(mockPendingOps[0] as any);

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
});
