import { Hero1 } from "./assets/hero-1";
import { Hero2 } from "./assets/hero-2";
import { Skill1 } from "./assets/skill-1";
import { Skill2 } from "./assets/skill-2";
import { Skill3 } from "./assets/skill-3";
import { Skill4 } from "./assets/skill-4";
import { Skill5 } from "./assets/skill-5";

export function Page1() {
  return (
    <div className="gap-7.5 mt-7.5 flex flex-col">
      <div className="gap-7.5 flex flex-col">
        <div className="flex flex-col gap-4">
          <span className="font-pixel text-main-gray text-xl font-bold">
            1. Choose your Hero
          </span>
          <div className="flex flex-row gap-5">
            <div className="flex flex-row items-center gap-5">
              <Hero1 className="h-32 w-32" />
              <Hero2 className="h-32 w-32" />
            </div>
            <span className="font-pixel text-main-gray text-lg">
              Before entering the arena, you&apos;ll need to create your hero.
              Choose from a variety of character classes, each with unique
              abilities and strengths.
            </span>
          </div>
        </div>
      </div>
      <div className="gap-7.5 flex flex-col">
        <div className="flex flex-col gap-4">
          <span className="font-pixel text-main-gray text-xl font-bold">
            2. Choose skills for your Hero
          </span>
          <div className="flex flex-row gap-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-row gap-4">
                <Skill1 className="h-20 w-20" />
                <Skill2 className="h-20 w-20" />
                <Skill3 className="h-20 w-20" />
              </div>
              <div className="flex flex-row gap-4">
                <Skill4 className="h-20 w-20" />
                <Skill5 className="h-20 w-20" />
              </div>
            </div>

            <span className="font-pixel text-main-gray text-lg">
              Customize your wizard&apos;s appearance and select skills that
              complement your playstyle. Consider the synergy between your
              skills to create a formidable strategy! You can choose three
              abilities from those offered for battle.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
