"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import type { IRefPhaserGame } from "@/PhaserGame";
import Game from "@/components/Game";
import { api } from "@/trpc/react";

const PhaserGame = dynamic(
  () => import("@/PhaserGame").then((mod) => mod.PhaserGame),
  {
    ssr: false,
  },
);

export default function GamePage() {
  //  References to the PhaserGame component (game and scene are exposed)
  const phaserRefAlly = useRef<IRefPhaserGame | null>(null);
  const phaserRefEnemy = useRef<IRefPhaserGame | null>(null);
  const { data: tilemapData } = api.tilemap.getTilemap.useQuery(
    {
      userAddress: "0x123",
      slot: "1",
    },
    {
      enabled: true, // !!userAddress
    },
  );

  // Event emitted from the PhaserGame component
  const currentScene = (scene: Phaser.Scene) => {
    console.log("Scene changed:", scene);
  };

  return (
    <Game>
      <PhaserGame
        ref={phaserRefAlly}
        currentActiveScene={currentScene}
        container="game-container-ally"
        isEnemy={false}
        tilemapData={tilemapData}
      />
      <PhaserGame
        ref={phaserRefEnemy}
        currentActiveScene={currentScene}
        container="game-container-enemy"
        isEnemy={true}
        tilemapData={tilemapData}
      />
    </Game>
  );
}
