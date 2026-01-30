import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExpeditionService } from '../services/expedition.service';
import { CreateExpeditionDto } from '../dto/create-expedition.dto';
import { UpdateExpeditionDto } from '../dto/update-expedition.dto';
import { Expedition } from '../schemas/expedition.schema';

@Controller('expeditions')
export class ExpeditionController {
  constructor(private readonly expeditionService: ExpeditionService) {}

  /**
   * Create a new expedition
   * POST /expeditions
   */
  @Post()
  createExpedition(@Body() dto: CreateExpeditionDto): Promise<Expedition> {
    return this.expeditionService.createExpedition(dto);
  }

  /**
   * Get all expeditions for a user
   * GET /expeditions/user/:userId
   */
  @Get('user/:userId')
  getUserExpeditions(@Param('userId') userId: string): Promise<Expedition[]> {
    return this.expeditionService.getUserExpeditions(userId);
  }

  /**
   * Get active expeditions for a user
   * GET /expeditions/user/:userId/active
   */
  @Get('user/:userId/active')
  getActiveExpeditions(@Param('userId') userId: string): Promise<Expedition[]> {
    return this.expeditionService.getActiveExpeditions(userId);
  }

  /**
   * Get expedition count for a user
   * GET /expeditions/user/:userId/count
   */
  @Get('user/:userId/count')
  getExpeditionCount(
    @Param('userId') userId: string,
  ): Promise<{ count: number }> {
    return this.expeditionService
      .getExpeditionCount(userId)
      .then((count) => ({ count }));
  }

  /**
   * Get active expedition count for a user
   * GET /expeditions/user/:userId/active/count
   */
  @Get('user/:userId/active/count')
  getActiveExpeditionCount(
    @Param('userId') userId: string,
  ): Promise<{ count: number }> {
    return this.expeditionService
      .getActiveExpeditionCount(userId)
      .then((count) => ({ count }));
  }

  /**
   * Get a specific expedition
   * GET /expeditions/:id
   */
  @Get(':id')
  getExpedition(@Param('id') id: string): Promise<Expedition> {
    return this.expeditionService.getExpeditionById(id);
  }

  /**
   * Update an expedition
   * PATCH /expeditions/:userId/:id
   */
  @Patch(':userId/:id')
  updateExpedition(
    @Param('userId') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateExpeditionDto,
  ): Promise<Expedition> {
    return this.expeditionService.updateExpedition(userId, id, updateDto);
  }

  /**
   * Complete an expedition and claim rewards
   * POST /expeditions/:userId/:id/complete
   */
  @Post(':userId/:id/complete')
  completeExpedition(
    @Param('userId') userId: string,
    @Param('id') id: string,
  ): Promise<Expedition> {
    return this.expeditionService.completeExpedition(userId, id);
  }

  /**
   * Interrupt an expedition and claim partial rewards
   * POST /expeditions/:userId/:id/interrupt
   */
  @Post(':userId/:id/interrupt')
  interruptExpedition(
    @Param('userId') userId: string,
    @Param('id') id: string,
  ): Promise<Expedition> {
    return this.expeditionService.interruptExpedition(userId, id);
  }

  /**
   * Delete an expedition
   * DELETE /expeditions/:userId/:id
   */
  @Delete(':userId/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteExpedition(
    @Param('userId') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.expeditionService.deleteExpedition(userId, id);
  }
}

