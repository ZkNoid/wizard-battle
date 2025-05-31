"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { IRefPhaserGame } from "@/PhaserGame";
import Game from "@/components/Game";
import type { Game as GameScene } from "@/game/scenes/Game";

const PhaserGame = dynamic(
  () => import("@/PhaserGame").then((mod) => mod.PhaserGame),
  {
    ssr: false,
  },
);

export default function GamePage() {
  //  References to the PhaserGame component (game and scene are exposed)
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  // Event emitted from the PhaserGame component
  const currentScene = (scene: Phaser.Scene) => {
    console.log("Scene changed:", scene);
  };

  return (
    <Game>
      <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
    </Game>
  );
}
