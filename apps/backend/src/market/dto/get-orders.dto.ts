import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../schemas/market-order.schema';

export class GetOrdersDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  paymentToken?: string;

  @IsOptional()
  @IsString()
  nameHash?: string;

  @IsOptional()
  @IsString()
  minPrice?: string;

  @IsOptional()
  @IsString()
  maxPrice?: string;

  @IsOptional()
  @IsEnum(['price', 'createdAt', 'orderId'])
  sortBy?: 'price' | 'createdAt' | 'orderId';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class OrderResponseDto {
  orderId!: number;
  maker!: string;
  taker?: string;
  token!: string;
  tokenId!: string;
  paymentToken!: string;
  amount!: string;
  price!: string;
  status!: string;
  nameHash!: string;
  blockNumber!: number;
  transactionHash!: string;
  createdAt!: Date;
  filledAt?: Date;
  canceledAt?: Date;
}
