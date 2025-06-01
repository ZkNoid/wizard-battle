"use client";

import HomePage from "@/components/HomePage";
import { useUserInformationStore } from "@/lib/store/userInformationStore";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { Stater, UserState } from "../../../common/stater";
import { MapStructure } from "../../../common/types/matchmaking.types";
import { Position } from "../../../common/types/matchmaking.types";
import { allSpells } from "../../../common/spells";
import { WizardId } from "../../../common/wizards";

export default function Home() {
  const { socket, setSocket, setStater } = useUserInformationStore();
  useEffect(() => {
    let socket = io(process.env.NEXT_PUBLIC_API_URL!);
    setSocket(socket);
    console.log(socket);
    const stater = new Stater(
      new UserState(
        socket.id!,
        WizardId.MAGE,
        MapStructure.random(10, 10),
        100,
        [allSpells[0]!, allSpells[1]!, allSpells[2]!],
        new Position(0, 0),
        [],
      ),
      "",
    );
    setStater(stater);
  }, []);
  return <HomePage />;
}
