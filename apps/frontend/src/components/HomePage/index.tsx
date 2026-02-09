'use client';

import { SocialLinks } from './SocialLinks';
import { useEffect, useState } from 'react';
import { Tab } from '@/lib/enums/Tab';
import HowToPlay from '../HowToPlay';
import Support from '../Support';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useMinaAppkit } from 'mina-appkit';
import WelcomeScreen from '../WelcomeScreen';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';
import { useBackgroundMusic } from '@/lib/hooks/useAudio';
import Header from '../Header';
import Modals from '../Header/Modals';
import { Button } from '../shared/Button';

enum TabHover {
  CRAFT,
  EXPEDITIONS,
  PVP,
  MARKET,
  CHARACTERS,
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>(Tab.HOME);
  const [tabHover, setTabHover] = useState<TabHover | undefined>(undefined);
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(false);

  const router = useRouter();
  const { address, triggerWallet } = useMinaAppkit();
  const {
    hasShownWelcomeScreen,
    setHasShownWelcomeScreen,
    setIsInventoryModalOpen,
    setIsCraftModalOpen,
    setIsExpeditionModalOpen,
    setIsTestnetModalOpen,
  } = useMiscellaneousSessionStore();
  const { playMainTheme, stopMusic } = useBackgroundMusic();

  // Initialize and play main theme on mount
  useEffect(() => {
    playMainTheme();

    // If autoplay is blocked, retry on first user interaction
    const handleFirstInteraction = () => {
      playMainTheme();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      // stopMusic(0);
    };
  }, [playMainTheme, stopMusic]);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1800);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <main className="relative flex h-screen w-full overflow-hidden">
      <Header onTabChange={setTab} />

      {/* Top right button */}
      <Button
        variant="gray"
        className="absolute right-20 top-40 z-30 rounded-lg px-6 py-3 font-bold shadow-lg transition-all hover:scale-105 hover:bg-purple-700 active:scale-95"
        onClick={() => {
          setIsTestnetModalOpen(true);
        }}
        isLong={true}
      >
        <Image
          src="/icons/lightning.png"
          width={32}
          height={28}
          alt="lightning"
          className="h-7 w-8 object-contain object-center"
        />
        <span className="font-pixel text-main-gray text-lg font-bold">
          Testnet quest
        </span>
      </Button>

      {/* Main section */}
      <section
        className={cn(
          'absolute inset-0 flex h-full w-full flex-col items-center justify-center',
          tab !== Tab.HOME && 'z-20'
        )}
      >
        {/* {tab === Tab.HOME && <MainMenu setTab={(tab) => setTab(tab as Tab)} />} */}
        {tab === Tab.HOW_TO_PLAY && (
          <HowToPlay setTab={(tab) => setTab(tab as Tab)} />
        )}
        {tab === Tab.SUPPORT && (
          <Support setTab={(tab) => setTab(tab as Tab)} />
        )}
      </section>

      <div className="bottom-12.5 absolute right-20 w-[20%]">
        {tab === Tab.HOME && <SocialLinks />}
      </div>

      {/* Background */}
      <div className="-z-49 top-19 absolute inset-0 max-h-screen w-full">
        <Image
          src={'/menu/background.png'}
          width={1920}
          height={1080}
          unoptimized={true}
          quality={100}
          alt="background"
          className="pixel-art absolute inset-0 -z-50 size-full object-cover object-center"
        />

        {tabHover !== undefined && (
          <Image
            src={
              tabHover === TabHover.EXPEDITIONS
                ? '/menu/hover-expeditions.png'
                : tabHover === TabHover.PVP
                  ? '/menu/hover-pvp.png'
                  : tabHover === TabHover.MARKET
                    ? isLargeScreen
                      ? '/menu/hover-market.png'
                      : '/menu/hover-market-small.png'
                    : tabHover === TabHover.CHARACTERS
                      ? '/menu/hover-characters.png'
                      : tabHover === TabHover.CRAFT
                        ? '/menu/hover-craft.png'
                        : ''
            }
            width={1920}
            height={1080}
            unoptimized={true}
            quality={100}
            alt="hoverBuilding"
            className="pixel-art -z-49 absolute inset-0 size-full object-cover object-center"
          />
        )}
      </div>

      <div className="absolute inset-0 top-20 grid max-h-screen w-full grid-cols-6 grid-rows-6 gap-0">
        <button
          className="col-span-2 row-span-2 row-start-2 row-end-4 size-full cursor-pointer"
          onClick={() => {
            setIsCraftModalOpen(true);
          }}
          onMouseEnter={() => setTabHover(TabHover.CRAFT)}
          onMouseLeave={() => setTabHover(undefined)}
        />
        <button
          className="col-span-2 col-start-3 row-span-4 size-full cursor-pointer"
          onClick={() => {
            if (!address) {
              triggerWallet();
              return;
            }
            router.push('/play');
          }}
          onMouseEnter={() => setTabHover(TabHover.PVP)}
          onMouseLeave={() => setTabHover(undefined)}
        />
        <button
          className="col-span-2 col-start-5 row-span-2 size-full cursor-pointer"
          onClick={() => {
            alert('Coming soon...');
          }}
          onMouseEnter={() => setTabHover(TabHover.MARKET)}
          onMouseLeave={() => setTabHover(undefined)}
        />
        <button
          className="col-span-2 col-start-5 row-span-3 row-start-4 size-full cursor-pointer"
          onClick={() => {
            setIsInventoryModalOpen(true);
          }}
          onMouseEnter={() => setTabHover(TabHover.CHARACTERS)}
          onMouseLeave={() => setTabHover(undefined)}
        />
        <button
          className="col-span-2 row-span-2 row-start-5 size-full cursor-pointer"
          onClick={() => {
            setIsExpeditionModalOpen(true);
          }}
          onMouseEnter={() => setTabHover(TabHover.EXPEDITIONS)}
          onMouseLeave={() => setTabHover(undefined)}
        />
      </div>

      <Modals />
      {!hasShownWelcomeScreen && (
        <WelcomeScreen onClick={() => setHasShownWelcomeScreen(true)} />
      )}
    </main>
  );
}
