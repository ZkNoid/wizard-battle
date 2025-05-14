"use client";

import { cn } from "@/lib/utils";
import { ButtonBg } from "./assets/button-bg";

export function Button({
  text,
  onClick,
  className,
}: {
  text: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-main-gray font-pixel relative z-[1] flex cursor-pointer items-center justify-center transition-all duration-300 hover:scale-105",
        className,
      )}
    >
      <span>{text}</span>
      <ButtonBg className="absolute inset-0 -z-[1] h-full w-full" />
    </button>
  );
}
