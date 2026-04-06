import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TournamentMatchDocument = HydratedDocument<TournamentMatch> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true, collection: 'tournament_matches' })
export class TournamentMatch {
  @Prop({ required: true, index: true })
  tournamentId!: string;

  @Prop({ required: true })
  roomId!: string;

  @Prop({ required: true, index: true })
  winnerId!: string;

  @Prop({ required: true, index: true })
  loserId!: string;

  @Prop({ required: true })
  winnerPlayerId!: string;

  @Prop({ required: true })
  loserPlayerId!: string;

  @Prop({ required: true, default: 1 })
  rounds!: number;

  @Prop({ required: true, default: false })
  surrendered!: boolean;
}

export const TournamentMatchSchema =
  SchemaFactory.createForClass(TournamentMatch);

TournamentMatchSchema.index({ tournamentId: 1, winnerId: 1 });
TournamentMatchSchema.index({ tournamentId: 1, loserId: 1 });
TournamentMatchSchema.index(
  { tournamentId: 1, winnerId: 1, loserId: 1 },
  { name: 'pair_lookup' }
);
TournamentMatchSchema.index(
  { tournamentId: 1, winnerPlayerId: 1, loserPlayerId: 1 },
  { name: 'pair_lookup_by_player' }
);
