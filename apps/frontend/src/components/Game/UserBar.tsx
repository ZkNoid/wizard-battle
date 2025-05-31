import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const getHealthGradient = (percentage: number) => {
  if (percentage > 60) {
    return "from-[#00B521] to-[#00B521]"; // Green for high health
  } else if (percentage > 30) {
    return "from-[#FFA500] to-[#FFA500]"; // Orange for medium health
  } else {
    return "from-[#FF0000] to-[#FF0000]"; // Red for low health
  }
};

export function UserBar({
  name,
  level,
  health,
  maxHealth,
  className,
}: {
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  className?: string;
}) {
  const healthPercentage = (health / maxHealth) * 100;
  const gradientClass = getHealthGradient(healthPercentage);

  return (
    <div className={cn("flex flex-row items-center gap-2.5", className)}>
      {/* Avatar */}
      <div className="w-22.5 h-22.5 border-3 border-main-gray bg-[#FBFAFA]" />
      <div className="flex flex-col gap-1.5">
        {/* Name */}
        <span className="font-pixel text-2xl text-[#FBFAFA]">{name}</span>
        <div className="flex flex-col">
          {/* Health bar */}
          <div className="w-81 h-7.5 border-3 border-main-gray relative -z-[1] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#F1F2F4] to-[#F1F2F4]" />
            <motion.div
              className={cn("absolute inset-0 bg-gradient-to-r", gradientClass)}
              initial={{ width: "100%" }}
              animate={{ width: `${healthPercentage}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
            <span className="text-main-gray font-pixel relative z-10 text-center text-xs">
              {health}/{maxHealth}
            </span>
          </div>
          {/* Xp bar */}
          <div className="border-3 border-main-gray -z-[1] flex h-6 w-20 items-center justify-center bg-[#F1F2F4]">
            <span className="text-main-gray font-pixel mt-1 text-xs">
              Lvl. {level}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
