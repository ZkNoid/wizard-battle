import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MarketOrderDocument = HydratedDocument<MarketOrder>;

export enum OrderStatus {
  NONE = 'NONE',
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  FILLED = 'FILLED',
  CANCELED = 'CANCELED',
}

@Schema({ timestamps: true, collection: 'market_orders' })
export class MarketOrder {
  @Prop({ required: true, unique: true, index: true })
  orderId!: number;

  @Prop({ required: true, index: true, lowercase: true })
  maker!: string;

  @Prop({ index: true, lowercase: true })
  taker?: string;

  @Prop({ required: true, lowercase: true })
  token!: string;

  @Prop({ required: true })
  tokenId!: string;

  @Prop({ required: true, lowercase: true })
  paymentToken!: string;

  @Prop({ required: true, default: '0' })
  paymentTokenId!: string;

  @Prop({ required: true })
  amount!: string;

  @Prop({ required: true })
  price!: string;

  @Prop({
    required: true,
    enum: OrderStatus,
    default: OrderStatus.NONE,
    index: true,
  })
  status!: OrderStatus;

  @Prop({ required: true, index: true })
  nameHash!: string;

  @Prop({ required: true })
  blockNumber!: number;

  @Prop({ required: true })
  transactionHash!: string;

  @Prop()
  filledAt?: Date;

  @Prop()
  canceledAt?: Date;

  @Prop()
  pausedAt?: Date;
}

export const MarketOrderSchema = SchemaFactory.createForClass(MarketOrder);

MarketOrderSchema.index({ status: 1, createdAt: -1 });
MarketOrderSchema.index({ maker: 1, status: 1 });
MarketOrderSchema.index({ paymentToken: 1, status: 1 });
MarketOrderSchema.index({ nameHash: 1, status: 1 });
