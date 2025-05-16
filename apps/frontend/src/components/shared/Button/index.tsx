"use client";

import { cn } from "@/lib/utils";
import { ButtonBgGray } from "./assets/button-bg-gray";
import { ButtonBgBlue } from "./assets/button-bg-blue";
import { ButtonBgRed } from "./assets/button-bg-red";

export function Button({
  text,
  children,
  variant,
  onClick,
  className,
}: {
  variant: "gray" | "blue" | "red";
  text?: string;
  children?: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-main-gray group/button font-pixel relative z-[1] flex cursor-pointer items-center justify-center transition-transform duration-300 hover:scale-105",
        className,
      )}
    >
      {children ? children : <span>{text}</span>}
      {variant === "gray" && (
        <ButtonBgGray className="absolute inset-0 -z-[1] h-full w-full" />
      )}
      {variant === "blue" && (
        <ButtonBgBlue className="absolute inset-0 -z-[1] h-full w-full" />
      )}
      {variant === "red" && (
        <ButtonBgRed className="absolute inset-0 -z-[1] h-full w-full" />
      )}
    </button>
  );
}
