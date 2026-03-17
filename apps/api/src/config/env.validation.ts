import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT: number;

  @IsString()
  DATABASE_URL: string;

  @Type(() => Number)
  @IsInt()
  @Min(10, {
    message: 'BCRYPT_ROUNDS must be at least 10 for adequate security.',
  })
  @Max(14, {
    message:
      'BCRYPT_ROUNDS cannot exceed 14 to prevent asymmetric DoS attacks.',
  })
  BCRYPT_ROUNDS: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed: ${errors.map((error) => error.toString()).join('\n')}`,
    );
  }

  return validatedConfig;
}
