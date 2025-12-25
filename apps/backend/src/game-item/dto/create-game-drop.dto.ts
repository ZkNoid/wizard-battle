// src/game-items/dto/create-drop.dto.ts

import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class ChanceRollsGroupDto {
  @IsEnum(['chance-rolls'])
  type!: 'chance-rolls';

  @IsNumber()
  @IsNotEmpty()
  rollsCount!: number;

  @IsNumber()
  @IsNotEmpty()
  chancePercent!: number;

  @IsString()
  @IsNotEmpty()
  rarity!: string;  // e.g., "unique", "common"
}

class GuaranteedGroupDto {
  @IsEnum(['guaranteed'])
  type!: 'guaranteed';

  @IsMongoId()
  item!: string;

  @IsNumber()
  @IsNotEmpty()
  quantity!: number;
}

class DurationDto {
  @IsNumber()
  @IsNotEmpty()
  durationHours!: number;

  @ValidateNested({ each: true })
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: ChanceRollsGroupDto, name: 'chance-rolls' },
        { value: GuaranteedGroupDto, name: 'guaranteed' },
      ],
    },
  })
  @ArrayMinSize(1)
  dropGroups!: Array<ChanceRollsGroupDto | GuaranteedGroupDto>;
}

export class CreateDropDto {
  @IsString()
  @IsNotEmpty()
  locationName!: string;

  @ValidateNested({ each: true })
  @Type(() => DurationDto)
  @ArrayMinSize(1)
  durations!: DurationDto[];
}