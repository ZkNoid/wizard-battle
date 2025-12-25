import { Controller } from '@nestjs/common';
import { GameItemService } from './services/game-item.service';

@Controller('game-items')
export class GameItemController {
  constructor(private readonly gameItemService: GameItemService) {}
}
