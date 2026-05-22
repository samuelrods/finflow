import { IsOptional, Matches } from 'class-validator';

export class QueryAnalyticsDto {
  /**
   * Filter by month in YYYY-MM format, e.g. "2026-05".
   * If omitted, defaults to the current calendar month.
   */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;
}
