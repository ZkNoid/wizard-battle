// src/game-items/controllers/game-item.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GameItemService } from '../services/game-item.service';
import { CreateGameItemDto } from '../dto/create-game-item.dto';
import { UpdateGameItemDto } from '../dto/update-game-item.dto';
import { GameItem } from '../schemas/game-item.schema';

@Controller('game-items')
export class GameItemController {
  constructor(private readonly gameItemService: GameItemService) {}

  @Post()
  create(@Body() createDto: CreateGameItemDto): Promise<GameItem> {
    return this.gameItemService.create(createDto);
  }

  @Get()
  findAll(): Promise<GameItem[]> {
    return this.gameItemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<GameItem> {
    return this.gameItemService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateGameItemDto,
  ): Promise<GameItem> {
    return this.gameItemService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<GameItem> {
    return this.gameItemService.delete(id);
  }
}