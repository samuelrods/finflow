import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';

@Module({
  imports: [ConfigModule.forRoot({ validate, isGlobal: true }), HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
