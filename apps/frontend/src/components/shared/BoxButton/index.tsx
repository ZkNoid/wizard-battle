"use client";

import type { ReactNode } from "react";
import { BoxBg } from "./assets/box-bg";
import { cn } from "@/lib/utils";

export default function BoxButton({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group/button relative z-[1] flex cursor-pointer items-center justify-center transition-transform duration-300 hover:scale-105",
        className,
      )}
    >
      {children}
      <BoxBg className="absolute inset-0 -z-[1] h-full w-full" />
    </button>
  );
}
