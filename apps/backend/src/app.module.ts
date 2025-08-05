import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { GameSessionModule } from "./game-session/game-session.module";

@Module({
  imports: [GameSessionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
