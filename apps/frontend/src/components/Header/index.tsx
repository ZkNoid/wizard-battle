'use client';

import Image from 'next/image';
import { SettingsBar } from '../BaseLayout/SettingsBar';
import Wallet from '../Wallet';
import WalletReown from '../WalletReown';
import { Button } from '../shared/Button';
import BoxButton from '../shared/BoxButton';
import { Tab } from '@/lib/enums/Tab';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';
import { TopBarIcon } from '../BaseLayout/assets/top-bar-icon';

interface HeaderProps {
  onTabChange?: (tab: Tab) => void;
}

export default function Header({ onTabChange }: HeaderProps) {
  const {
    setIsInventoryModalOpen,
    setIsCraftModalOpen,
    setIsExpeditionModalOpen,
  } = useMiscellaneousSessionStore();

  return (
    <>
      {/* Top bar background */}
      <div className="-z-48 absolute inset-0 h-fit w-full">
        <TopBarIcon className="pixel-art h-full w-full object-cover object-center" />
      </div>

      {/* Header content */}
      <div className="absolute left-0 top-2.5 z-50 grid w-full grid-cols-3 items-center px-20">
        <SettingsBar setTab={onTabChange} />
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
        <div className="flex w-full items-center justify-between gap-5 px-10">
          <Button
            variant="gray"
            className="h-15 flex w-40 items-center justify-center gap-2.5"
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
            className="h-15 flex w-40 items-center justify-center gap-2.5"
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
          <Wallet className="w-25" />
          <WalletReown className="w-25" />
        </div>
      </div>
    </>
  );
}
