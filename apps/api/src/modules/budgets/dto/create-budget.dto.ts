import { IsInt, IsNumber, IsPositive, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ example: 500.0, description: 'Budget limit amount' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 5, description: 'Month of the budget (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 2026, description: 'Year of the budget' })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'Category ID',
  })
  @IsUUID()
  categoryId: string;
}
