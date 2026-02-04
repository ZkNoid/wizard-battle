import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  GameCharacter,
  GameCharacterDocument,
} from './schemas/game-character.schema';
import { CreateGameCharacterDto } from './dto/create-game-character.dto';

@Injectable()
export class GameCharacterService {
  constructor(
    @InjectModel(GameCharacter.name)
    private gameCharacterModel: Model<GameCharacterDocument>
  ) {}

  async create(
    userId: string,
    createGameCharacterDto: CreateGameCharacterDto
  ): Promise<GameCharacter> {
    const character = new this.gameCharacterModel({
      ...createGameCharacterDto,
      userId,
    });
    return character.save();
  }

  async findAllByUserId(userId: string): Promise<GameCharacter[]> {
    return this.gameCharacterModel.find({ userId }).exec();
  }

  async findOne(id: string): Promise<GameCharacter | null> {
    return this.gameCharacterModel.findById(id).exec();
  }

  async update(
    id: string,
    updateData: Partial<CreateGameCharacterDto>
  ): Promise<GameCharacter | null> {
    return this.gameCharacterModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async delete(id: string): Promise<GameCharacter | null> {
    return this.gameCharacterModel.findByIdAndDelete(id).exec();
  }
}
