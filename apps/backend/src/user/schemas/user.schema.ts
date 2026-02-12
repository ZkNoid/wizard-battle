import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  address!: string;

  @Prop({ required: true, default: 0 })
  xp!: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index for efficient address queries
UserSchema.index({ address: 1 });
