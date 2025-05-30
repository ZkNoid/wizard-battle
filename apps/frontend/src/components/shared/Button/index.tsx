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
  type = "button",
  disabled,
}: {
  variant: "gray" | "blue" | "red";
  text?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-main-gray not-disabled:group/button font-pixel not-disabled:hover:scale-105 relative z-[1] flex cursor-pointer items-center justify-center transition-transform duration-300 disabled:cursor-not-allowed",
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
