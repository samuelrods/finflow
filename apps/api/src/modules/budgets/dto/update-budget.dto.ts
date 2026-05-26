import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBudgetDto {
  @ApiProperty({ example: 600.0, description: 'Updated budget limit amount' })
  @IsNumber()
  @IsPositive()
  amount: number;
}
