import { ExperienceBg } from "./assets/exeprience-bg";

export function Experience({
  title,
  expWidth,
  expColor,
  level,
  plusExp,
}: {
  title: string;
  expWidth: number;
  expColor: string;
  level: number;
  plusExp: number;
}) {
  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <span className="font-pixel ml-0.75 text-base text-white">{title}</span>
      <div className="w-144 h-7.5 relative flex flex-row items-center justify-between px-2.5">
        <span className="font-pixel text-main-gray z-[1] mt-0.5 text-xs">
          Lvl. {level}
        </span>
        <span className="font-pixel text-main-gray z-[1] mt-0.5 text-xs">
          +{plusExp}
        </span>
        <ExperienceBg
          className="w-144 h-7.5 absolute left-0 top-0"
          expWidth={expWidth}
          expColor={expColor}
        />
      </div>
    </div>
  );
}
