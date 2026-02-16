import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserQuest, UserQuestSchema } from './schemas/user-quest.schema';
import { QuestsService } from './services/quests.service';
import { QuestsController } from './controllers/quests.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserQuest.name, schema: UserQuestSchema },
    ]),
  ],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}

