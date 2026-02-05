import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExpeditionService } from '../services/expedition.service';
import { ExpeditionDto } from '../dto/expedition.dto';
import { Expedition } from '../schemas/expedition.schema';

@Controller('expedition')
export class ExpeditionController {
  constructor(private readonly expeditionService: ExpeditionService) {}

  /**
   * Launch a new expedition
   * POST /expedition/launch
   */
  @Post('launch')
  @HttpCode(HttpStatus.CREATED)
  launchExpedition(@Body() dto: ExpeditionDto): Promise<Expedition> {
    return this.expeditionService.launchExpedition(dto);
  }

  /**
   * Complete an expedition and claim rewards
   * POST /expedition/complete
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  completeExpedition(@Body() dto: ExpeditionDto): Promise<{
    expedition: Expedition;
    addedItems: Array<{ itemId: string; amount: number }>;
  }> {
    return this.expeditionService.completeExpedition(dto);
  }

  /**
   * Get user's active expeditions
   * GET /expedition/active/:userId
   */
  @Get('active/:userId')
  getUserActiveExpeditions(
    @Param('userId') userId: string
  ): Promise<Expedition[]> {
    return this.expeditionService.getUserActiveExpeditions(userId);
  }

  /**
   * Get user's expedition history
   * GET /expedition/history/:userId
   */
  @Get('history/:userId')
  getUserExpeditionHistory(
    @Param('userId') userId: string
  ): Promise<Expedition[]> {
    return this.expeditionService.getUserExpeditionHistory(userId);
  }

  /**
   * Cancel an active expedition
   * POST /expedition/cancel/:userId/:expeditionId
   */
  @Post('cancel/:userId/:expeditionId')
  @HttpCode(HttpStatus.OK)
  cancelExpedition(
    @Param('userId') userId: string,
    @Param('expeditionId') expeditionId: string
  ): Promise<Expedition> {
    return this.expeditionService.cancelExpedition(userId, expeditionId);
  }
}
