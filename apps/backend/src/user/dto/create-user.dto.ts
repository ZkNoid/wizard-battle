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
}
