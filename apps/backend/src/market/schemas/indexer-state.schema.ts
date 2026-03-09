import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type IndexerStateDocument = HydratedDocument<IndexerState>;

@Schema({ timestamps: true, collection: 'indexer_state' })
export class IndexerState {
  @Prop({ required: true, unique: true, lowercase: true })
  contractAddress!: string;

  @Prop({ required: true })
  lastProcessedBlock!: number;

  @Prop({ required: true })
  lastUpdated!: Date;

  @Prop({ default: false })
  isFullySynced!: boolean;

  @Prop({ default: 0 })
  totalOrdersIndexed!: number;
}

export const IndexerStateSchema = SchemaFactory.createForClass(IndexerState);
