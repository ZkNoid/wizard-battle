import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameCharacterController } from './game-character.controller';
import { GameCharacterService } from './game-character.service';
import {
  GameCharacter,
  GameCharacterSchema,
} from './schemas/game-character.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameCharacter.name, schema: GameCharacterSchema },
    ]),
  ],
  controllers: [GameCharacterController],
  providers: [GameCharacterService],
  exports: [GameCharacterService],
})
export class GameCharacterModule {}
