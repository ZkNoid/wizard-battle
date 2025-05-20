"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import type { IRefPhaserGame } from "@/PhaserGame";

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
    console.log(scene);
  };

  return (
    <div
      id="app"
      className="flex h-screen w-full items-center justify-center overflow-hidden"
    >
      <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
    </div>
  );
}
