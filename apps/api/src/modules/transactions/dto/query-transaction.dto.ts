import { IsEnum, IsOptional, IsUUID, Matches } from 'class-validator';
import { TransactionType } from '../enums/transaction-type.enum';

export class QueryTransactionDto {
  /** Filter by month in YYYY-MM format, e.g. "2024-01" */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
}
