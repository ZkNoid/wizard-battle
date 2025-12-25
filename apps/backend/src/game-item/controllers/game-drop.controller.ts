// src/game-items/controllers/drop.controller.ts

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
import { DropService } from '../services/game-item-drop.service';
import { CreateDropDto } from '../dto/create-game-drop.dto';
import { UpdateDropDto } from '../dto/update-game-drop.dto';
import { GameItemDrop } from '../schemas/game-item-drop.schema';
import { LootRequestDto } from '../dto/loot-request.dto';
import { LootResponseDto } from '../dto/loot-response.dto';

@Controller('game-item-drops')
export class DropController {
  constructor(private readonly dropService: DropService) {}

  @Post()
  create(@Body() createDto: CreateDropDto): Promise<GameItemDrop> {
    return this.dropService.create(createDto);
  }

  @Get()
  findAll(): Promise<GameItemDrop[]> {
    return this.dropService.findAll();
  }

  // Bonus: easy lookup by location name
  @Get('location/:locationName')
  findByLocation(@Param('locationName') locationName: string): Promise<GameItemDrop> {
    return this.dropService.findByLocation(locationName);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<GameItemDrop> {
    return this.dropService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDropDto,
  ): Promise<GameItemDrop> {
    return this.dropService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<GameItemDrop> {
    return this.dropService.delete(id);
  }

  @Post('loot')
  async generateLoot(@Body() lootDto: LootRequestDto): Promise<LootResponseDto> {
    // You can later add auth guard to extract userId from token instead of body
    return this.dropService.generateLoot(lootDto);
  }
}