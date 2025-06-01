import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io";
import {
  Impact,
  MatchFoundResponse,
  MatchPlayerData,
  NextRoundResponseV2,
  SpellEffect,
  UserTurn,
} from "../../../common/types/matchmaking.types";
import { allSpells } from "../../../common/spells";
import { allWizards } from "../../../common/wizards";
import { TransformedUserTurnV2 } from "../types/matchmaking.types";
import { Action } from "../../../common/stater";

interface GameSession {
  id: string;
  players: Socket[];
  playersData: MatchPlayerData[];
  currentRound: number;
}

@Injectable()
export class GameSessionService {
  private activeSessions: Map<string, GameSession> = new Map();
  private socketToSession: Map<string, string> = new Map(); // Maps socket ID to session ID

  // sessionId -> turnId -> actions[]
  private actions: Map<string, Map<number, Action[]>> = new Map();

  // sessionId -> roundId -> Number of submitted actions
  private submittedActions: Map<string, Map<number, number>> = new Map();

  private publicState: Map<string, Map<number, MatchPlayerData[]>> = new Map();

  // sessionId -> roundId -> turns
  private turns: Map<string, Map<number, UserTurn[]>> = new Map();

  createSession(
    id: string,
    players: Socket[],
    playersData: MatchPlayerData[],
  ): string {
    if (players.length !== playersData.length) {
      throw new Error("Players and playersData must have the same length");
    }

    // TODO: Check player datas id

    const session: GameSession = {
      id: id,
      players: players,
      playersData: playersData,
      currentRound: 0,
    };

    this.activeSessions.set(session.id, session);
    // Map both players' socket IDs to this session
    players.forEach((player) => {
      this.socketToSession.set(player.id, session.id);
    });

    this.turns.set(session.id, new Map());

    // console.log("GameSessionService createSession", session.id);
    // console.log("this.activeSessions", session);
    // console.log(
    //   "this.socketToSession",
    //   session.playersData.map((data) => data.position),
    // );

    return session.id;
  }

  private setupDisconnectHandlers(socket: Socket, sessionId: string) {
    socket.on("disconnect", () => {
      this.handlePlayerDisconnect(socket.id, sessionId);
    });
  }

  private handlePlayerDisconnect(socketId: string, sessionId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Remove socket mapping
    this.socketToSession.delete(socketId);

    // Notify the other player about the disconnect
    session.players.forEach((player) => {
      if (player.id !== socketId) {
        player.emit("playerDisconnected", {
          sessionId,
          disconnectedPlayerId: socketId,
        });
      }
    });

    // End the session if both players are disconnected
    const remainingSockets = session.players.filter((p) =>
      this.socketToSession.has(p.id),
    );

    if (remainingSockets.length === 0) {
      this.endSession(sessionId);
    }
  }

  getSession(sessionId: string): GameSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  getSessionBySocketId(socketId: string): GameSession | undefined {
    const sessionId = this.socketToSession.get(socketId);
    return sessionId ? this.getSession(sessionId) : undefined;
  }

  startNextRoundV2(sessionId: string): void {
    console.log("startNextRoundV2", sessionId);
    const session = this.getSession(sessionId);
    if (!session) return;

    session.players.forEach((player) => {
      player.emit("nextRoundV2", {
        sessionId,
        currentRound: session.currentRound,
        state: this.publicState.get(sessionId)?.get(session.currentRound) || [],
        actions: this.actions.get(sessionId)?.get(session.currentRound) || [],
      } satisfies NextRoundResponseV2);
    });
    session.currentRound++;
  }

  endSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      // Clean up socket mappings
      session.players.forEach((player) => {
        this.socketToSession.delete(player.id);
      });
      this.activeSessions.delete(sessionId);
    }
  }

  endSessionV2(sessionId: string, alivePlayers: MatchPlayerData[]): void {
    const session = this.activeSessions.get(sessionId);

    if (session) {
      session.players.forEach((player) => {
        player.emit("gameOver", {
          sessionId,
          winners: alivePlayers.map((data) => data.playerId),
        });
      });
    }
  }

  private turnsSubmitted(sessionId: string): void {
    console.log("turnsSubmitted", sessionId);
    const session = this.getSession(sessionId);
    if (!session) return;

    const allActions =
      this.actions.get(sessionId)?.get(session.currentRound) || [];

    for (const player of session.players) {
      player.emit("submittedActions", {
        sessionId,
        currentRound: session.currentRound,
        actions: allActions,
      });
    }
  }

  addActions(sessionId: string, playerId: string, turn: TransformedUserTurnV2) {
    console.log("addActions", sessionId, playerId, turn);
    const session = this.getSession(sessionId);
    if (!session) return;

    let actionsData = this.actions.get(sessionId);
    if (!actionsData) {
      actionsData = new Map();
    }

    let currentActions = actionsData.get(session.currentRound);
    if (!currentActions) {
      currentActions = [];
    }

    currentActions.push(...turn.actions);

    actionsData.set(session.currentRound, currentActions);
    this.actions.set(sessionId, actionsData);

    console.log("currentActions", currentActions);

    if (currentActions.length === session.players.length) {
      this.turnsSubmitted(sessionId);
    }
  }

  updatePublicState(
    sessionId: string,
    playerId: string,
    state: MatchPlayerData,
  ) {
    const session = this.getSession(sessionId);
    if (!session) return;

    let roundState = this.publicState.get(sessionId);

    if (!roundState) {
      roundState = new Map();
    }

    const publicState = roundState.get(session.currentRound) || [];

    publicState.push(state);

    roundState.set(session.currentRound, publicState);

    this.publicState.set(sessionId, roundState);

    if (publicState.length === session.players.length) {
      const alivePlayers = publicState.filter(
        (state) => state.health && state.health > 0,
      );
      if (alivePlayers.length < 2) {
        this.endSessionV2(sessionId, alivePlayers);
      } else {
        this.startNextRoundV2(sessionId);
      }
    }
  }
}
