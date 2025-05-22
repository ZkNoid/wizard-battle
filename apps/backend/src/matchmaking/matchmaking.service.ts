import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";
import {
  MatchPlayerData,
  QueueEntry,
  MatchFoundResponse,
} from "../../../common/types/matchmaking.types";
import { GameSessionService } from "../game-session/game-session.service";

@Injectable()
export class MatchmakingService {
  private queue: QueueEntry[] = [];

  constructor(private gameSessionService: GameSessionService) {}

  addToQueue(socket: Socket, matchData: MatchPlayerData): boolean {
    if (this.queue.length > 0) {
      const opponent = this.queue.shift();
      if (opponent) {
        this.notifyMatch(
          socket,
          opponent.socket,
          matchData,
          opponent.matchData
        );
        return true;
      }
    }
    this.queue.push({ socket, matchData });
    return false;
  }

  removeFromQueue(socket: Socket): void {
    const index = this.queue.findIndex((entry) => entry.socket === socket);
    if (index > -1) {
      this.queue.splice(index, 1);
    }
  }

  private notifyMatch(
    player1: Socket,
    player2: Socket,
    player1Data: MatchPlayerData,
    player2Data: MatchPlayerData
  ): void {
    const matchId = Math.random().toString(36).substring(7);

    // Create a new game session
    this.gameSessionService.createSession(
      matchId,
      [player1, player2],
      [player1Data, player2Data]
    );

    console.log("Match found between:", player1.id, player2.id);

    // const firstPlayerState = this.gameSessionService.getStateForPlayer(
    //   matchId,
    //   player1.id
    // );
    // const secondPlayerState = this.gameSessionService.getStateForPlayer(
    //   matchId,
    //   player2.id
    // );

    const player1Response: MatchFoundResponse = {
      matchId,
      opponent: player2.id,
      state: [player1Data, player2Data],
    };
    const player2Response: MatchFoundResponse = {
      matchId,
      opponent: player1.id,
      state: [player2Data, player1Data],
    };

    console.log("Player 1 response:", player1Response);
    console.log("Player 2 response:", player2Response);

    player1.emit("matchFound", player1Response);
    player2.emit("matchFound", player2Response);
  }
}
