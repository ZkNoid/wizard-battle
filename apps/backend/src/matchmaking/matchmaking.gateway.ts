import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { MatchmakingService } from "./matchmaking.service";
import { plainToClass } from "class-transformer";
import { TransformedMatchPlayerData } from "../types/matchmaking.types";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class MatchmakingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server | undefined;

  constructor(private matchmakingService: MatchmakingService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.matchmakingService.removeFromQueue(client);
  }

  @SubscribeMessage("findMatch")
  handleFindMatch(client: Socket, matchData: any) {
    console.log(`Client ${client.id} looking for match`);

    const transformedData = plainToClass(TransformedMatchPlayerData, matchData);
    const matchFound = this.matchmakingService.addToQueue(
      client,
      transformedData[0]!,
    );

    if (!matchFound) {
      client.emit("waitingForOpponent");
    }
  }

  @SubscribeMessage("findBotMatch")
  handleFindBotMatch(client: Socket, matchData: any) {
    console.log(`Client ${client.id} looking for bot match`);

    const transformedData = plainToClass(TransformedMatchPlayerData, matchData);

    this.matchmakingService.findBotMatch(client);
  }

  @SubscribeMessage("botReady")
  handleBotReady(client: Socket) {
    console.log(`Client ${client.id} is ready for bot match`);
  }
}
