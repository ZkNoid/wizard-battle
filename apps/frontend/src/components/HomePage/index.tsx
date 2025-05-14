import { MainMenu } from "./MainMenu";
import background from "../../../public/background.svg";
import Image from "next/image";
import AudioSelector from "../AudioSelector";
import ConnectWallet from "../ConnectWallet";

export default function HomePage() {
  return (
    <main className="relative flex h-screen w-full">
      {/* Audio */}
      <div className="mt-12.5 ml-20 w-[20%]">
        <AudioSelector />
      </div>
      {/* Main Menu */}
      <div className="flex h-full w-[60%] flex-col items-center justify-center">
        <MainMenu />
      </div>
      {/* WalletConnect */}
      <div className="mt-12.5 mr-20 w-[20%]">
        <ConnectWallet />
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
