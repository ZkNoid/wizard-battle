import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { GameCharacterService } from './game-character.service';
import { CreateGameCharacterDto } from './dto/create-game-character.dto';

@Controller('game-characters')
export class GameCharacterController {
  constructor(private readonly gameCharacterService: GameCharacterService) {}

  @Post()
  async create(
    @Body() createDto: CreateGameCharacterDto,
    @Query('userId') userId: string
  ) {
    return this.gameCharacterService.create(userId, createDto);
  }

  @Get('user/:userId')
  async findAllByUser(@Param('userId') userId: string) {
    return this.gameCharacterService.findAllByUserId(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.gameCharacterService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateGameCharacterDto>
  ) {
    return this.gameCharacterService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.gameCharacterService.delete(id);
  }
}
