import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PendingOperationDocument = HydratedDocument<PendingOperation> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum OperationType {
  BuyTicket = 'buyTicket',
  AdvanceToBattle = 'advanceToBattle',
  FinalizeTournament = 'finalizeTournament',
}

export enum OperationStatus {
  Queued = 'queued',
  Proving = 'proving',
  Submitted = 'submitted',
  Confirmed = 'confirmed',
  Failed = 'failed',
}

@Schema({ timestamps: true, collection: 'pending_operations' })
export class PendingOperation {
  @Prop({ required: true, index: true })
  tournamentId!: string;

  @Prop({ required: true, enum: OperationType })
  type!: OperationType;

  @Prop({ required: true, index: true })
  playerPubKey!: string;

  @Prop({
    required: true,
    enum: OperationStatus,
    default: OperationStatus.Queued,
    index: true,
  })
  status!: OperationStatus;

  @Prop()
  txHash?: string;

  @Prop({ required: true, default: 0 })
  retryCount!: number;

  @Prop()
  error?: string;

  @Prop()
  confirmedAt?: Date;

  @Prop()
  unsignedTxJson?: string;
}

export const PendingOperationSchema =
  SchemaFactory.createForClass(PendingOperation);

PendingOperationSchema.index({ tournamentId: 1, status: 1 });
PendingOperationSchema.index({ tournamentId: 1, playerPubKey: 1, type: 1 });
PendingOperationSchema.index({ status: 1, createdAt: 1 });
