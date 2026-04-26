import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { TournamentController } from './tournament.controller.js';
import {
  TournamentStateService,
  ProofGeneratorService,
  ChainMonitorService,
} from './services/index.js';
import { TournamentStatus } from './schemas/tournament.schema.js';
import { OperationType, OperationStatus } from './schemas/pending-operation.schema.js';
import { Types } from 'mongoose';

describe('TournamentController', () => {
  let controller: TournamentController;
  let tournamentStateService: TournamentStateService;
  let proofGeneratorService: ProofGeneratorService;
  let chainMonitorService: ChainMonitorService;

  const mockOptimisticState = {
    tournamentId: '1',
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
    registeredPlayers: ['B62qPlayer1', 'B62qPlayer2'],
    pendingPlayers: ['B62qPending1'],
  };

  const mockVerifiedState = {
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
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    controller = module.get<TournamentController>(TournamentController);
    tournamentStateService = module.get<TournamentStateService>(
      TournamentStateService
    );
    proofGeneratorService = module.get<ProofGeneratorService>(
      ProofGeneratorService
    );
    chainMonitorService = module.get<ChainMonitorService>(ChainMonitorService);
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

    it('should reject if tournament not in registration', async () => {
      const battleTournament = {
        ...mockVerifiedState,
        verified: { ...mockVerifiedState.verified, status: 'Battle' },
      };
      jest
        .spyOn(tournamentStateService, 'getVerifiedState')
        .mockResolvedValue(battleTournament as any);

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
