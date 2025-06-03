"use client";

import type { ReactNode } from "react";
import { Spells } from "./Spells";
import { Button } from "../shared/Button";
import BoxButton from "../shared/BoxButton";
import { HelpIcon } from "./assets/help-icon";
import { Clock } from "./Clock";
import { Users } from "./Users";
import { useRouter } from "next/navigation";
import { useUserInformationStore } from "@/lib/store/userInformationStore";
export default function Game({
  children,
}: {
  children: [ReactNode, ReactNode];
}) {
  const router = useRouter();
  const { stater } = useUserInformationStore();
  return (
    <>
      <div className="flex h-screen w-full flex-col">
        {/* top bar ---------------------------------------------------- */}
        <div className="h-1/5">
          <Users />
        </div>

        {/* game area -------------------------------------------------- */}
        <div className="flex min-h-0 w-full flex-1">
          <div className="relative min-h-0 min-w-0 flex-[2]">{children[0]}</div>

          <div className="flex min-h-0 min-w-0 flex-[1] items-center justify-center">
            <Clock className="left-[43%] top-[30%]" />
          </div>

          <div className="relative min-h-0 min-w-0 flex-[2]">{children[1]}</div>
        </div>
      </div>

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
          skills={stater?.getCurrentState()?.skillsInfo ?? []}
          className="col-span-5 col-start-4"
        />
        <BoxButton onClick={() => {}} className="col-span-3 mr-auto h-20 w-20">
          <HelpIcon className="h-12.5 w-7.5" />
        </BoxButton>
      </div>
    </>
  );
}
