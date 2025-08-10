import { motion } from "motion/react";
import { SlotBg } from "./assets/slot-bg";
import { cn } from "@/lib/utils";

export function SaveSlot({
  slot,
  className,
  isActive,
  onClick,
}: {
  slot: "1" | "2" | "3" | "4";
  className: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{
        x: 0,
      }}
      whileHover={{
        x: isActive ? 100 : 100,
      }}
      animate={isActive ? { x: 100 } : { x: 0 }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 12,
        duration: 0.3,
      }}
      className={cn(
        "w-65 h-33 relative flex cursor-pointer flex-col items-center justify-center",
        className,
      )}
      onClick={onClick}
    >
      <div className="text-main-gray font-pixel top-13 absolute right-5 z-[1] text-center text-3xl font-bold">
        {slot}
      </div>
      <SlotBg className="absolute inset-0" />
    </motion.div>
  );
}
