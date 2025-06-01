"use client";

import { PlaySteps } from "@/lib/enums/PlaySteps";
import { ModeBg } from "./assets/mode-bg";
import { Button } from "../shared/Button";
import { TimeIcon } from "./assets/time-icon";
import { QueueIcon } from "./assets/queue-icon";
import { useUserInformationStore } from "@/lib/store/userInformationStore";
import { useEffect, useRef, useState } from "react";
import type { MatchFoundResponse } from "../../../../common/types/matchmaking.types";
import { useRouter } from "next/navigation";

export default function Matchmaking({
  setPlayStep,
}: {
  setPlayStep: (playStep: PlaySteps) => void;
}) {
  const router = useRouter();
  const { socket, stater } = useUserInformationStore();

  const sendRequest = useRef(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!socket) return;
    if (!stater) return;
    if (sendRequest.current) return;
    sendRequest.current = true;
    let state = stater.getPublicState();
    console.log(state);
    socket.emit("findMatch", state);

    socket.on("matchFound", (response: MatchFoundResponse) => {
      router.push(`/game`);
    });
  }, [socket, stater]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="px-15 py-13.5 w-143 h-143 relative flex flex-col items-center">
      <span className="font-pixel text-main-gray mt-7 text-3xl">
        Matchmaking
      </span>
      <div className="mt-10 flex flex-col gap-10">
        {/* Time Spent */}
        <div className="flex items-center gap-5">
          <TimeIcon className="h-20 w-20" />
          <div className="font-pixel text-main-gray flex flex-col gap-1">
            <span className="text-xl">Time Spent:</span>
            <span className="text-3xl">{formatTime(elapsedTime)}</span>
          </div>
        </div>
        {/* Queue Position */}
        <div className="flex items-center gap-5">
          <QueueIcon className="h-20 w-20" />
          <div className="font-pixel text-main-gray flex flex-col gap-1">
            <span className="text-xl">Place in Queue:</span>
            <span className="text-3xl">1</span>
          </div>
        </div>
      </div>
      <div className="mt-auto flex w-full flex-col items-center justify-center">
        <Button
          variant="gray"
          className="w-106 h-15"
          onClick={() => {
            setPlayStep(PlaySteps.SELECT_MAP);
          }}
        >
          Cancel
        </Button>
        {/* DEBUG Buttons */}
        <div className="flex gap-5">
          <Button
            variant="gray"
            className="h-15 w-60"
            onClick={() => {
              setPlayStep(PlaySteps.LOSE);
            }}
          >
            Lose
          </Button>
          <Button
            variant="gray"
            className="h-15 w-60"
            onClick={() => {
              setPlayStep(PlaySteps.WIN);
            }}
          >
            Win
          </Button>
        </div>
      </div>
      <ModeBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
    </div>
  );
}
