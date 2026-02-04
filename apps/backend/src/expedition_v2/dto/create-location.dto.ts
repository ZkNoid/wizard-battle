import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class RewardDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;
}

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  image!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RewardDto)
  possibleRewards!: RewardDto[];

  @IsNumber()
  @Min(1)
  minRewards!: number;

  @IsNumber()
  @Min(1)
  maxRewards!: number;
}

