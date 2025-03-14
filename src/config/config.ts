import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  JWT_SECRET: process.env.JWT_SECRET,
  NATS_SERVERS: process.env.NATS_SERVERS,
}));
