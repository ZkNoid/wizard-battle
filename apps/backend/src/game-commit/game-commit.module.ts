import { Module } from '@nestjs/common';
import { GameCommitService } from './game-commit.service';
import { GameCommitController } from './game-commit.controller';
import { BlockchainService } from './blockchain.service';
import { GameItemModule } from '../game-item/game-item.module';
import { UserInventoryModule } from '../user-inventory/user-inventory.module';
import { GameCharacterModule } from '../game-character/game-character.module';

@Module({
  imports: [GameItemModule, UserInventoryModule, GameCharacterModule],
  providers: [GameCommitService, BlockchainService],
  controllers: [GameCommitController],
})
export class GameCommitModule {}
