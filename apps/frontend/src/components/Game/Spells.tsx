import { cn } from "@/lib/utils";
import { SpellsBg } from "./assets/spells-bg";
import type { ISkill } from "@/lib/types/IWizard";
import Image from "next/image";

export function Spells({
  skills,
  className,
}: {
  skills: ISkill[];
  className?: string;
}) {
  const MAX_SKILLS = 7;
  return (
    <div className={cn("w-217 h-32.5 relative flex flex-col", className)}>
      {/* Skills */}
      <div className={"px-15 flex flex-row gap-5 py-5"}>
        {skills.map((skill) => (
          <Image
            key={skill.id}
            className={
              "w-22.5 h-22.5 cursor-pointer transition-transform duration-300 hover:scale-110"
            }
            src={skill.imageURL}
            alt={"skill"}
            width={90}
            height={90}
          />
        ))}
        {/* Empty skills */}
        {Array.from({ length: MAX_SKILLS - skills.length }).map((_, index) => (
          <Image
            key={index}
            className="w-22.5 h-22.5"
            src={"/wizards/skills/empty.svg"}
            alt={"empty skill"}
            width={90}
            height={90}
          />
        ))}
      </div>
      <SpellsBg className="w-217 h-32.5 absolute left-0 top-0 -z-[1]" />
    </div>
  );
}
