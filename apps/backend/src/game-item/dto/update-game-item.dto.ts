import { PartialType } from '@nestjs/mapped-types';
import { CreateGameItemDto } from './create-game-item.dto';

export class UpdateGameItemDto extends PartialType(CreateGameItemDto) {}