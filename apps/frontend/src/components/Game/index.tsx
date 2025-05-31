"use client";

import type { ReactNode } from "react";
import { Spells } from "./Spells";
import { wizards } from "@/lib/constants/DEBUG_wizards";
import { Button } from "../shared/Button";
import BoxButton from "../shared/BoxButton";
import { HelpIcon } from "./assets/help-icon";
import { Clock } from "./Clock";
import { Users } from "./Users";
import { useRouter } from "next/navigation";

export default function Game({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <>
      {children}
      <Users />
      <Clock className="absolute left-[43%] top-[30%]" />
      {/* Footer */}
      <div className="pb-12.5 absolute bottom-0 left-0 z-[1] grid w-full grid-cols-11 items-end justify-center gap-5">
        <Button
          variant="blue"
          text="Give up"
          onClick={() => {
            router.push("/");
          }}
          className="h-15 w-89 col-span-3 ml-auto"
        />
        <Spells
          skills={wizards[0]?.skills ?? []}
          className="col-span-5 col-start-4"
        />
        <BoxButton onClick={() => {}} className="col-span-3 mr-auto h-20 w-20">
          <HelpIcon className="h-12.5 w-7.5" />
        </BoxButton>
      </div>
    </>
  );
}
