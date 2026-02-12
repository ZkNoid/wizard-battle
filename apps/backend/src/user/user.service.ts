import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = new this.userModel(createUserDto);
    return user.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByAddress(address: string): Promise<User | null> {
    return this.userModel.findOne({ address }).exec();
  }

  async update(
    id: string,
    updateData: Partial<CreateUserDto>
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async updateByAddress(
    address: string,
    updateData: Partial<CreateUserDto>
  ): Promise<User | null> {
    return this.userModel
      .findOneAndUpdate({ address }, updateData, { new: true })
      .exec();
  }

  async delete(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async addXP(address: string, amount: number): Promise<User | null> {
    return this.userModel
      .findOneAndUpdate(
        { address },
        { $inc: { xp: amount } },
        { new: true }
      )
      .exec();
  }
}
