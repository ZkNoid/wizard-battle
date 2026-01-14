'use client';

import { SocialLinks } from './SocialLinks';
import { useEffect, useState } from 'react';
import { Tab } from '@/lib/enums/Tab';
import HowToPlay from '../HowToPlay';
import Support from '../Support';
import { TopBarIcon } from '../BaseLayout/assets/top-bar-icon';
import Image from 'next/image';
// import background from '../../../public/menu/background.svg';
// import hoverCraft from '../../../public/menu/hover-craft.png';
// import hoverExpeditions from '../../../public/menu/hover-expeditions.png';
// import hoverPVP from '../../../public/menu/hover-pvp.png';
// import hoverMarket from '../../../public/menu/hover-market.png';
// import hoverMarketSmall from '../../../public/menu/hover-market-small.svg';
// import hoverCharacters from '../../../public/menu/hover-characters.png';
import { SettingsBar } from '../BaseLayout/SettingsBar';
import Wallet from '../Wallet';
import { Button } from '../shared/Button';
import BoxButton from '../shared/BoxButton';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useMinaAppkit } from 'mina-appkit';
import InventoryModal from '../InventoryModal';
import WelcomeScreen from '../WelcomeScreen';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';
import CraftModal from '../CraftModal';
import ExpeditionModal from '../ExpeditionModal';

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

  const [isInventoryModalOpen, setIsInventoryModalOpen] =
    useState<boolean>(false);

  const [isCraftModalOpen, setIsCraftModalOpen] = useState<boolean>(false);

  const [isExpeditionModalOpen, setIsExpeditionModalOpen] =
    useState<boolean>(false);

  const router = useRouter();
  const { address, triggerWallet } = useMinaAppkit();
  const { hasShownWelcomeScreen, setHasShownWelcomeScreen } =
    useMiscellaneousSessionStore();

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
      <div className="z-1 absolute left-0 top-2.5 grid w-full grid-cols-3 items-center px-20">
        <SettingsBar setTab={setTab} />
        <div className="flex w-full items-center justify-center gap-5">
          <BoxButton color="gray" onClick={() => {}} className="size-16">
            <Image
              src={'/icons/market.png'}
              width={32}
              height={32}
              quality={100}
              unoptimized={true}
              alt="market"
              className="h-8 w-8"
            />
          </BoxButton>
          <BoxButton
            color="gray"
            onClick={() => {
              setIsInventoryModalOpen(true);
            }}
            className="size-16"
          >
            <Image
              src={'/icons/inventory.png'}
              width={28}
              height={32}
              quality={100}
              unoptimized={true}
              alt="inventory"
              className="h-8 w-7"
            />
          </BoxButton>
          <BoxButton color="gray" onClick={() => {}} className="size-16">
            <Image
              src={'/icons/mail.png'}
              width={32}
              height={23}
              quality={100}
              unoptimized={true}
              alt="mail"
              className="h-6 w-8"
            />
          </BoxButton>
          <BoxButton color="gray" onClick={() => {}} className="size-16">
            <Image
              src={'/icons/tournaments.png'}
              width={36}
              height={32}
              quality={100}
              unoptimized={true}
              alt="tournaments"
              className="h-8 w-9"
            />
          </BoxButton>
        </div>
        <div className="grid w-full grid-cols-3 items-center gap-10">
          <Button
            variant="gray"
            className="w-70 h-15 flex items-center gap-2.5"
          >
            <Image
              src={'/icons/gold-coin.png'}
              width={32}
              height={32}
              unoptimized={true}
              alt="gold-coin"
              quality={100}
              className="h-8 w-8"
            />
            <span>100M</span>
          </Button>
          <Button
            variant="gray"
            className="w-70 h-15 flex items-center gap-2.5"
          >
            <Image
              src={'/icons/diamond.png'}
              width={32}
              height={28}
              unoptimized={true}
              quality={100}
              alt="diamond"
              className="h-7 w-8"
            />
            <span>1.25K</span>
          </Button>
          <Wallet />
        </div>
      </div>

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

      {/* Top bar */}
      <div className="-z-48 absolute inset-0 h-fit w-full">
        <TopBarIcon className="pixel-art h-full w-full object-cover object-center" />
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

      {isInventoryModalOpen && (
        <InventoryModal onClose={() => setIsInventoryModalOpen(false)} />
      )}
      {!hasShownWelcomeScreen && (
        <WelcomeScreen onClick={() => setHasShownWelcomeScreen(true)} />
      )}

      {isCraftModalOpen && (
        <CraftModal onClose={() => setIsCraftModalOpen(false)} />
      )}

      {isExpeditionModalOpen && (
        <ExpeditionModal onClose={() => setIsExpeditionModalOpen(false)} />
      )}
    </main>
  );
}
