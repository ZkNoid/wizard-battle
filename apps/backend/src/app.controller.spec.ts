import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GameStateService } from './game-session/game-state.service';
import { MatchmakingService } from './matchmaking/matchmaking.service';
import { createMock } from '@golevelup/ts-jest';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: GameStateService,
          useValue: createMock<GameStateService>(),
        },
        {
          provide: MatchmakingService,
          useValue: createMock<MatchmakingService>(),
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
