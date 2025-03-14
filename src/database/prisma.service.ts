import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('Database - Auth Microservice');

  onModuleInit() {
    this.$connect();
    this.logger.log('Database connected!');
  }

  onModuleDestroy() {
    this.$disconnect();
    this.logger.log('Database disconnected!');
  }
}
