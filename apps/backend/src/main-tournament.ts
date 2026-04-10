import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { TournamentAppModule } from './tournament-app.module';

async function bootstrap() {
  const app = await NestFactory.create(TournamentAppModule);
  app.enableCors({ origin: '*' });

  const port = process.env.TOURNAMENT_APP_PORT ?? 3032;
  await app.listen(port);
  console.log(`Tournament service running on port ${port}`);
}
bootstrap();
