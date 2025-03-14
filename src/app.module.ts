import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import config from './config/config';
import * as Joi from 'joi';
import { NatsModule } from './transports/nats.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './database/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [config],
      isGlobal: true,
      validationSchema: Joi.object({
        NATS_SERVERS: Joi.string()
          .custom((value, helpers) => {
            const servers = value.split(',');
            if (servers.every((server: any) => typeof server === 'string')) {
              return value;
            } else {
              return helpers.error('any.invalid', {
                message: 'NATS_SERVERS must be a valid list of strings',
              });
            }
          })
          .required(),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
      }),
    }),
    NatsModule,
    AuthModule,
    PrismaModule,
  ],
})
export class AppModule {}
