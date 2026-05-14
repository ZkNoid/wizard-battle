import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { TournamentController } from './tournament.controller.js';
import {
  TournamentStateService,
  ProofGeneratorService,
  ChainMonitorService,
  MinaClientService,
  OperationEventsService,
  TournamentLeaderboardService,
} from './services/index.js';
import { TournamentStatus } from './schemas/tournament.schema.js';
import { OperationType, OperationStatus } from './schemas/pending-operation.schema.js';
import { Types } from 'mongoose';

describe('TournamentController', () => {
  let controller: TournamentController;
  let tournamentStateService: TournamentStateService;
  let proofGeneratorService: ProofGeneratorService;
  let chainMonitorService: ChainMonitorService;
  let minaClientService: MinaClientService;

  const mockOptimisticState = {
    tournamentId: '1',
    status: TournamentStatus.Battle,
    battleStartSlot: 500,
    battleEndSlot: 1000,
    claimDeadlineSlot: 2000,
    ticketPrice: '1000000000',
    feePercent: 0,
    prizePercents: [2500, 1500, 1000, 1000, 1000, 700, 700, 700, 500, 400],
    prizePool: '5000000000',
    sponsorContribution: '0',
    participantCount: 5,
    registeredPlayers: ['B62qPlayer1', 'B62qPlayer2'],
    pendingPlayers: ['B62qPending1'],
    winners: [],
  };

  const mockVerifiedState = {
    tournamentId: '1',
    verified: {
      status: TournamentStatus.Battle,
      battleStartSlot: 500,
      battleEndSlot: 1000,
      ticketPrice: '1000000000',
      prizePercents: [2500, 1500, 1000, 1000, 1000, 700, 700, 700, 500, 400],
      prizePool: '5000000000',
      participantCount: 5,
      participantsRoot: '123',
      winnersRoot: '0',
      lastVerifiedBlock: 100,
    },
    participants: new Map([
      ['B62qPlayer1', true],
      ['B62qPlayer2', true],
    ]),
    tournamentsRoot: '789',
  };

  beforeEach(async () => {
    const testModule: TestingModule = await Test.createTestingModule({
      controllers: [TournamentController],
      providers: [
        {
          provide: TournamentStateService,
          useValue: createMock<TournamentStateService>(),
        },
        {
          provide: ProofGeneratorService,
          useValue: createMock<ProofGeneratorService>(),
        },
        {
          provide: ChainMonitorService,
          useValue: createMock<ChainMonitorService>(),
        },
        {
          provide: MinaClientService,
          useValue: {
            getCurrentSlot: jest.fn().mockResolvedValue(600),
            submitTransaction: jest.fn(),
          },
        },
        {
          provide: OperationEventsService,
          useValue: createMock<OperationEventsService>(),
        },
        {
          provide: TournamentLeaderboardService,
          useValue: createMock<TournamentLeaderboardService>(),
        },
      ],
    }).compile();

    controller = testModule.get<TournamentController>(TournamentController);
    tournamentStateService = testModule.get<TournamentStateService>(
      TournamentStateService
    );
    proofGeneratorService = testModule.get<ProofGeneratorService>(
      ProofGeneratorService
    );
    chainMonitorService = testModule.get<ChainMonitorService>(ChainMonitorService);
    minaClientService = testModule.get<MinaClientService>(MinaClientService);
  });

  describe('getTournament', () => {
    it('should return tournament optimistic state', async () => {
      jest
        .spyOn(tournamentStateService, 'getOptimisticState')
        .mockResolvedValue(mockOptimisticState);

      const result = await controller.getTournament('1');

      expect(result).toEqual(mockOptimisticState);
    });

    it('should throw 404 for non-existent tournament', async () => {
      jest
        .spyOn(tournamentStateService, 'getOptimisticState')
        .mockResolvedValue(null);

      await expect(controller.getTournament('999')).rejects.toThrow(
        new HttpException('Tournament 999 not found', HttpStatus.NOT_FOUND)
      );
    });
  });

  describe('getParticipants', () => {
    it('should return participants list', async () => {
      jest
        .spyOn(tournamentStateService, 'getOptimisticState')
        .mockResolvedValue(mockOptimisticState);

      const result = await controller.getParticipants('1');

      expect(result.tournamentId).toBe('1');
      expect(result.registered).toEqual(['B62qPlayer1', 'B62qPlayer2']);
      expect(result.pending).toEqual(['B62qPending1']);
      expect(result.total).toBe(5);
    });
  });

  describe('buyTicket', () => {
    it('should queue buy ticket operation', async () => {
      jest
        .spyOn(tournamentStateService, 'getVerifiedState')
        .mockResolvedValue(mockVerifiedState as any);
      jest
        .spyOn(tournamentStateService, 'getPendingOperationsForPlayer')
        .mockResolvedValue([]);
      jest
        .spyOn(tournamentStateService, 'addPendingOperation')
        .mockResolvedValue({
          _id: new Types.ObjectId(),
          tournamentId: '1',
          type: OperationType.BuyTicket,
          playerPubKey: 'B62qNewPlayer',
          status: OperationStatus.Queued,
          retryCount: 0,
        } as any);

      const result = await controller.buyTicket('1', {
        playerPubKey: 'B62qNewPlayer',
      });

      expect(result.status).toBe('queued');
      expect(result.message).toContain('queued');
    });

    it('should reject if tournament is not in battle phase', async () => {
      const claimingTournament = {
        ...mockVerifiedState,
        verified: { ...mockVerifiedState.verified, status: 'Claiming' },
      };
      jest
        .spyOn(tournamentStateService, 'getVerifiedState')
        .mockResolvedValue(claimingTournament as any);

      await expect(
        controller.buyTicket('1', { playerPubKey: 'B62qNewPlayer' })
      ).rejects.toThrow(HttpException);
    });

    it('should reject if current slot is outside the battle join window', async () => {
      jest
        .spyOn(tournamentStateService, 'getVerifiedState')
        .mockResolvedValue(mockVerifiedState as any);
      jest
        .spyOn(minaClientService, 'getCurrentSlot')
        .mockResolvedValue(100);
      jest
        .spyOn(tournamentStateService, 'getPendingOperationsForPlayer')
        .mockResolvedValue([]);

      await expect(
        controller.buyTicket('1', { playerPubKey: 'B62qNewPlayer' })
      ).rejects.toThrow(HttpException);
    });

    it('should reject if player already registered', async () => {
      jest
        .spyOn(tournamentStateService, 'getVerifiedState')
        .mockResolvedValue(mockVerifiedState as any);

      await expect(
        controller.buyTicket('1', { playerPubKey: 'B62qPlayer1' })
      ).rejects.toThrow(new HttpException(
        'Player B62qPlayer1 is already registered',
        HttpStatus.CONFLICT
      ));
    });

    it('should reject if player has pending operation', async () => {
      jest
        .spyOn(tournamentStateService, 'getVerifiedState')
        .mockResolvedValue(mockVerifiedState as any);
      jest
        .spyOn(tournamentStateService, 'getPendingOperationsForPlayer')
        .mockResolvedValue([
          {
            type: OperationType.BuyTicket,
            status: OperationStatus.Queued,
          },
        ] as any);

      await expect(
        controller.buyTicket('1', { playerPubKey: 'B62qNewPlayer' })
      ).rejects.toThrow(HttpException);
    });
  });

  describe('submitTransaction', () => {
    it('marks operation failed when broadcast throws', async () => {
      const opId = new Types.ObjectId();
      jest
        .spyOn(tournamentStateService, 'getVerifiedState')
        .mockResolvedValue(mockVerifiedState as any);
      jest.spyOn(tournamentStateService, 'getPendingOperationById').mockResolvedValue({
        _id: opId,
        tournamentId: '1',
        status: OperationStatus.Submitted,
        playerPubKey: 'B62qP',
        type: OperationType.BuyTicket,
        txHash: undefined,
      } as any);
      jest
        .spyOn(minaClientService, 'submitTransaction')
        .mockRejectedValue(new Error('mempool full'));
      const failSpy = jest
        .spyOn(tournamentStateService, 'failOperationIfAwaitingBroadcast')
        .mockResolvedValue(true);

      await expect(
        controller.submitTransaction('1', {
          operationId: opId.toString(),
          signedTxJson: '{"foo":1}',
        })
      ).rejects.toThrow(HttpException);

      expect(failSpy).toHaveBeenCalledWith(
        opId.toString(),
        'broadcast_failed: mempool full'
      );
    });
  });

  describe('abandonOperation', () => {
    it('returns ok when abandon succeeds', async () => {
      const opId = new Types.ObjectId();
      jest.spyOn(tournamentStateService, 'abandonPlayerOperation').mockResolvedValue({
        ok: true,
      });

      const result = await controller.abandonOperation('1', opId.toString(), {
        playerPubKey: 'B62qP',
      });

      expect(result).toEqual({ ok: true, status: OperationStatus.Failed });
      expect(tournamentStateService.abandonPlayerOperation).toHaveBeenCalledWith(
        '1',
        opId.toString(),
        'B62qP'
      );
    });

    it('returns 403 when player does not match', async () => {
      const opId = new Types.ObjectId();
      jest.spyOn(tournamentStateService, 'abandonPlayerOperation').mockResolvedValue({
        ok: false,
        reason: 'wrong_player',
      });

      await expect(
        controller.abandonOperation('1', opId.toString(), {
          playerPubKey: 'B62qOther',
        })
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    });
  });

  describe('getChainStatus', () => {
    it('should return chain and proof generator status', async () => {
      jest.spyOn(chainMonitorService, 'getChainStatus').mockResolvedValue({
        connected: true,
        currentSlot: 12345,
        contractAddress: 'B62qContract',
      });
      jest.spyOn(proofGeneratorService, 'isReady').mockReturnValue(true);

      const result = await controller.getChainStatus();

      expect(result.connected).toBe(true);
      expect(result.currentSlot).toBe(12345);
      expect(result.proofGeneratorReady).toBe(true);
    });
  });
});
