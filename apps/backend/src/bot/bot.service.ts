import { Injectable } from "@nestjs/common";
import * as path from "path";
import { Socket } from "socket.io";
import { Worker } from "worker_threads";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class BotService {
  constructor() {}

  launchBot(opponentId: string) {
    return new Promise((resolve, reject) => {
      const sessionId = uuidv4();
      const worker = new Worker(path.resolve(__dirname, "bot.worker.ts"), {
        workerData: {
          opponentId,
          sessionId,
        },
      });

      worker.on("message", (result) => resolve(result));
      worker.on("error", (err) => reject(err));
      worker.on("exit", (code) => {
        if (code !== 0)
          reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
  }
}
