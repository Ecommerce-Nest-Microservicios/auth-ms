import { Global, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { NATS_SERVICE } from "../config/microservices";
import config from "../config/config";
import { ConfigType } from "@nestjs/config";

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: NATS_SERVICE,
        inject: [config.KEY],
        useFactory: (configService: ConfigType<typeof config>) => {
          return {
            transport: Transport.NATS,
            options: {
              servers: configService.NATS_SERVERS,
            },
          };
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class NatsModule {}
