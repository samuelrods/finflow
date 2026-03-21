import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;
}
