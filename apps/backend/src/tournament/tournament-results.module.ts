import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Tournament,
  TournamentSchema,
} from './schemas/tournament.schema.js';
import {
  TournamentMatch,
  TournamentMatchSchema,
} from './schemas/tournament-match.schema.js';
import {
  PendingOperation,
  PendingOperationSchema,
} from './schemas/pending-operation.schema.js';
import { TournamentResultRecorderService } from './services/index.js';

/**
 * Lightweight module that provides TournamentResultRecorderService
 * for use by the main GameSessionModule. Includes Tournament and
 * TournamentMatch schemas for validation and result persistence.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tournament.name, schema: TournamentSchema },
      { name: TournamentMatch.name, schema: TournamentMatchSchema },
      { name: PendingOperation.name, schema: PendingOperationSchema },
    ]),
  ],
  providers: [TournamentResultRecorderService],
  exports: [TournamentResultRecorderService],
})
export class TournamentResultsModule {}
