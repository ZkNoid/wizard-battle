"use client";

import { MainMenu } from "./MainMenu";
import { ZknoidLink } from "./ZknoidLink";
import { SocialLinks } from "./SocialLinks";
import { useState } from "react";
import { Tab } from "@/lib/enums/Tab";
import BaseLayout from "../BaseLayout";
import HowToPlay from "../HowToPlay";
import Support from "../Support";

export default function HomePage() {
  const [tab, setTab] = useState<Tab>(Tab.HOME);

  return (
    <BaseLayout>
      {/* Main section */}
      <section
        className={"flex h-full w-full flex-col items-center justify-center"}
      >
        {tab === Tab.HOME && <MainMenu setTab={(tab) => setTab(tab as Tab)} />}
        {tab === Tab.HOW_TO_PLAY && (
          <HowToPlay setTab={(tab) => setTab(tab as Tab)} />
        )}
        {tab === Tab.SUPPORT && (
          <Support setTab={(tab) => setTab(tab as Tab)} />
        )}
      </section>
      {/* Left bottom bar */}
      <div className="bottom-12.5 absolute left-20 w-[20%]">
        {tab === Tab.HOME && <ZknoidLink />}
      </div>
      {/* Left bottom bar */}
      <div className="bottom-12.5 absolute right-20 w-[20%]">
        {tab === Tab.HOME && <SocialLinks />}
      </div>
    </BaseLayout>
  );
}
