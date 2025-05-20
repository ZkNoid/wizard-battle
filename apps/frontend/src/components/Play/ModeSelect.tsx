import { Button } from "../shared/Button";
import { ModeBg } from "./assets/mode-bg";
import { PveIcon } from "./assets/pve-icon";
import { PvpIcon } from "./assets/pvp-icon";
import { PlaySteps } from "@/lib/enums/PlaySteps";
import { PlayMode } from "@/lib/enums/PlayMode";

export function ModeSelect({
  setPlayStep,
  setPlayMode,
}: {
  setPlayStep: (playStep: PlaySteps) => void;
  setPlayMode: (playMode: PlayMode) => void;
}) {
  return (
    <div className="flex items-center gap-5">
      {/* Pvp */}
      <div className="px-15 py-13.5 w-143 h-143 relative flex flex-col items-center">
        <PvpIcon className="w-66 h-54" />
        <span className="font-pixel text-main-gray mt-7 text-3xl">PvP</span>
        <span className="font-pixel text-main-gray mt-4 text-center text-xl">
          Engage in duels against other players. Show all your magical prowess
          and strategic skills to overpower your opponent and earn experience
          for each win.
        </span>
        <div className="mt-auto flex w-full items-center justify-center">
          <Button
            variant="gray"
            className="w-106 h-15"
            onClick={() => {
              setPlayStep(PlaySteps.SELECT_CHARACTER);
              setPlayMode(PlayMode.PVP);
            }}
          >
            Start
          </Button>
        </div>
        <ModeBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
      </div>
      {/* Pve */}
      <div className="px-15 py-13.5 w-143 h-143 relative flex flex-col items-center">
        <PveIcon className="w-71 h-52" />
        <span className="font-pixel text-main-gray mt-7 text-3xl">PvE</span>
        <span className="font-pixel text-main-gray mt-4 text-center text-xl">
          Battle against a computer enemy to hone your skills in the Wizard
          training grounds.
        </span>
        <div className="mt-auto flex w-full items-center justify-center">
          <Button
            variant="gray"
            className="w-106 h-15"
            onClick={() => {
              setPlayStep(PlaySteps.SELECT_CHARACTER);
              setPlayMode(PlayMode.PVE);
            }}
          >
            Start
          </Button>
        </div>
        <ModeBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
      </div>
    </div>
  );
}
