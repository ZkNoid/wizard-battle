import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { GameSessionService } from "./game-session.service";
import { UserTurn } from "../../../common/types/matchmaking.types";
import {
  TransformedUserTurn,
  TransformedUserTurnV2,
} from "../types/matchmaking.types";
import { plainToClass } from "class-transformer";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class GameSessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server | undefined;

  constructor(private gameSessionService: GameSessionService) {}

  handleConnection(client: Socket) {
    console.log(`Game client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Game client disconnected: ${client.id}`);
    // The disconnect is now handled in the GameSessionService
  }

  // Client side state managment
  @SubscribeMessage("SendActions")
  sendActions(client: Socket, payload: { sessionId: string; turnData: any }) {
    const { sessionId, turnData } = payload;

    console.log(turnData);

    // Transform the incoming turn data
    const transformedTurn = plainToClass(TransformedUserTurnV2, turnData);

    console.log(transformedTurn);

    // Add the action to the actions map
    for (const action of transformedTurn  ) {
      this.gameSessionService.addActions(sessionId, client.id, action);
    }
  }

  @SubscribeMessage("updatePublicState")
  updatePublicState(
    client: Socket,
    payload: { sessionId: string; state: any },
  ) {
    const { sessionId, state } = payload;

    this.gameSessionService.updatePublicState(sessionId, client.id, state);
  }
}
