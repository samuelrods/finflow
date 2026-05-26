import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { DatabaseModule } from '../../database/database.module';
import { CategoriesModule } from '../categories/categories.module';
import { BudgetsModule } from '../budgets/budgets.module';

@Module({
  imports: [DatabaseModule, CategoriesModule, BudgetsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository],
})
export class TransactionsModule {}
