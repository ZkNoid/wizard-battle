"use client";

import { useEffect, useState } from "react";
import { Button } from "../shared/Button";
import { PlayStepOrder, PlaySteps } from "@/lib/enums/PlaySteps";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function Navigation({
  playStep,
  setPlayStep,
  className,
}: {
  playStep: PlaySteps;
  setPlayStep: (playStep: PlaySteps) => void;
  className?: string;
}) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(
    PlayStepOrder.indexOf(playStep),
  );

  useEffect(() => {
    setCurrentIndex(PlayStepOrder.indexOf(playStep));
  }, [playStep]);

  return (
    <nav className={cn("flex w-full items-center justify-between", className)}>
      {currentIndex >= 0 && (
        <Button
          variant="blue"
          className="h-15 mr-auto w-80"
          onClick={() => {
            if (currentIndex === 0) router.push("/");

            if (currentIndex > 0) {
              const prevStep = PlayStepOrder[currentIndex - 1];
              if (prevStep) setPlayStep(prevStep);
            }
          }}
        >
          Back
        </Button>
      )}
      {currentIndex < PlayStepOrder.length - 1 &&
        playStep !== PlaySteps.SELECT_MODE && (
          <Button
            variant="blue"
            className="h-15 ml-auto w-80"
            onClick={() => {
              if (currentIndex < PlayStepOrder.length - 1) {
                const nextStep = PlayStepOrder[currentIndex + 1];
                if (nextStep) setPlayStep(nextStep);
              }
            }}
          >
            Next
          </Button>
        )}
    </nav>
  );
}
