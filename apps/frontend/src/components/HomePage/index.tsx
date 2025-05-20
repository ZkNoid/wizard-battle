"use client";

import { MainMenu } from "./MainMenu";
import { ZknoidLink } from "./ZknoidLink";
import { SocialLinks } from "./SocialLinks";
import { useState } from "react";
import { Tab } from "@/lib/enums/Tab";
import { cn } from "@/lib/utils";
import BaseLayout from "../BaseLayout";

export default function HomePage() {
  const [tab, setTab] = useState<Tab>(Tab.HOME);

  return (
    <BaseLayout>
      {/* Main section */}
      <section
        className={"flex h-full w-full flex-col items-center justify-center"}
      >
        {tab === Tab.HOME && <MainMenu setTab={(tab) => setTab(tab as Tab)} />}
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
