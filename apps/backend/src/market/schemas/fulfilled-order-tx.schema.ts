import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FulfilledOrderTxDocument = HydratedDocument<FulfilledOrderTx>;

@Schema({ timestamps: true, collection: 'fulfilled_order_txs' })
export class FulfilledOrderTx {
  @Prop({ required: true, unique: true, index: true })
  txHash!: string;

  @Prop({ required: true })
  orderId!: string;

  @Prop({ required: true, lowercase: true })
  taker!: string;
}

export const FulfilledOrderTxSchema =
  SchemaFactory.createForClass(FulfilledOrderTx);
