import { Module } from '@nestjs/common';
import { GameCommitService } from './game-commit.service';
import { GameCommitController } from './game-commit.controller';

@Module({
  providers: [GameCommitService],
  controllers: [GameCommitController]
})
export class GameCommitModule {}
