import { MainMenu } from "./MainMenu";
import background from "../../../public/background.svg";
import Image from "next/image";
import Wallet from "@/components/Wallet";
import { ZknoidLink } from "./ZknoidLink";
import { SocialLinks } from "./SocialLinks";
import { SettingsBar } from "./SettingsBar";

export default function HomePage() {
  return (
    <main className="relative flex h-screen w-screen">
      {/* Left Bar */}
      <div className="my-12.5 ml-20 flex w-[20%] flex-col justify-between">
        <SettingsBar />
        <ZknoidLink />
      </div>
      {/* Main Menu */}
      <div className="flex h-full w-[60%] flex-col items-center justify-center">
        <MainMenu />
      </div>
      {/* Right Bar */}
      <div className="my-12.5 mr-20 flex w-[20%] flex-col justify-between">
        <Wallet />
        <SocialLinks />
      </div>

      {/* Background */}
      <div className="absolute inset-0 -z-50 h-full w-full">
        <Image
          src={background}
          alt="background"
          className="h-full w-full object-cover object-center"
        />
      </div>
    </main>
  );
}
