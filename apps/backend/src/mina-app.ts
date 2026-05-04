import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { MinaAppModule } from './mina-app.module';

async function bootstrap() {
  const logger = new Logger('MinaApp');

  logger.log('Starting Mina Service...');

  const app = await NestFactory.create(MinaAppModule);

  app.enableCors();

  const port = process.env.MINA_APP_PORT ?? 3031;
  await app.listen(port);

  logger.log(`Mina Tournament Service running on port ${port}`);
  logger.log(`Contract address: ${process.env.TOURNAMENT_CONTRACT_ADDRESS || 'NOT SET'}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start Mina Tournament Service:', err);
  process.exit(1);
});
