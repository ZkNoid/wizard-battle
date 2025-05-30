import { parentPort, workerData } from "worker_threads";
import { io, Socket } from "socket.io-client";
import { Bot } from "./bot/Bot";
import { Action } from "../../../common/stater";

interface GameState {
  actions: Action[];
  // Add other game state properties here
}

interface MatchData {
  // Add your match data properties here
  [key: string]: any;
}

function simulateBotLogic(data: { opponentId: string; sessionId: string }) {
  if (!process.env.NEXT_PUBLIC_SERVER_URL) {
    throw new Error("NEXT_PUBLIC_SERVER_URL environment variable is not set");
  }

  let socket: Socket | null = null;
  let bot: Bot | null = null;

  try {
    // Create socket connection
    socket = io(process.env.NEXT_PUBLIC_SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    bot = new Bot(data.opponentId, socket, data.sessionId);

    socket.on("connect", () => {
      console.log(`Bot connected with socket ID: ${socket?.id}`);
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log(`Bot disconnected: ${reason}`);
    });

    socket.on("matchFound", (matchData: MatchData) => {
      console.log(`Bot found match:`, matchData);
      bot?.makeMove();
    });

    socket.on("submittedActions", (data: { state: GameState }) => {
      console.log(`Bot received actions:`, data);
      bot?.updateState(data.state.actions);
    });

    socket.on("nextRoundV2", (data: MatchData) => {
      console.log(`Bot received next round:`, data);
      bot?.makeMove();
    });

    socket.on("gameOver", (data: MatchData) => {
      console.log(`Bot received game over:`, data);
      cleanup();
    });

    // Handle worker termination
    if (parentPort) {
      parentPort.on("message", (message) => {
        if (message === "terminate") {
          cleanup();
        }
      });
    }
  } catch (error: unknown) {
    console.error("Error in bot worker:", error);
    cleanup();
    throw error;
  }

  function cleanup() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    bot = null;
  }
}

if (parentPort) {
  try {
    const result = simulateBotLogic(workerData);
    parentPort.postMessage(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      parentPort.postMessage({ error: error.message });
    } else {
      parentPort.postMessage({ error: "An unknown error occurred" });
    }
  }
}
