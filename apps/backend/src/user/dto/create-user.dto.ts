import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  xp?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  mage_xp?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  archer_xp?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  duelist_xp?: number;
}
