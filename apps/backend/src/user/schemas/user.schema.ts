import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, minimize: false })
export class User {
  @Prop({ required: true, unique: true, index: true })
  address!: string;

  @Prop({ type: Number, required: true, default: 0 })
  xp!: number;

  @Prop({ type: Number, default: 0 })
  mage_xp!: number;

  @Prop({ type: Number, default: 0 })
  archer_xp!: number;

  @Prop({ type: Number, default: 0 })
  duelist_xp!: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index for efficient address queries
UserSchema.index({ address: 1 });
