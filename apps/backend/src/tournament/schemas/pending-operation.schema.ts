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
  ClaimPrize = 'claimPrize',
}

export enum OperationStatus {
  Queued = 'queued',
  Proving = 'proving',
  Submitted = 'submitted',
  Confirmed = 'confirmed',
  Failed = 'failed',
}

/** Snapshot for {@link OperationType.FinalizeTournament} (proof + DB apply). */
export type FinalizeWinnerPayload = {
  publicKey: string;
  prizeAmount: string;
  place: 1 | 2 | 3;
};

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

  @Prop({
    type: [
      {
        publicKey: { type: String, required: true },
        prizeAmount: { type: String, required: true },
        place: { type: Number, required: true },
      },
    ],
    required: false,
  })
  finalizeWinners?: FinalizeWinnerPayload[];
}

export const PendingOperationSchema =
  SchemaFactory.createForClass(PendingOperation);

PendingOperationSchema.index({ tournamentId: 1, status: 1 });
PendingOperationSchema.index({ tournamentId: 1, playerPubKey: 1, type: 1 });
PendingOperationSchema.index({ status: 1, createdAt: 1 });

// Prevents duplicate active operations at the DB level.
// Only one queued/proving/submitted operation per (tournament, player, type) is allowed.
PendingOperationSchema.index(
  { tournamentId: 1, playerPubKey: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['queued', 'proving', 'submitted'] },
    },
    name: 'unique_active_operation',
  }
);
