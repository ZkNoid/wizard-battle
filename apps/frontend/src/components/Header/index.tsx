'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useMinaAppkit } from 'mina-appkit';
import { SettingsBar } from '../BaseLayout/SettingsBar';
import Wallet from '../Wallet';
import WalletReown from '../WalletReown';
import { Button } from '../shared/Button';
import BoxButton from '../shared/BoxButton';
import { Tab } from '@/lib/enums/Tab';
import { useMiscellaneousSessionStore } from '@/lib/store/miscellaneousSessionStore';
import { useInventoryStore } from '@/lib/store/inventoryStore';
import { TopBarIcon } from '../BaseLayout/assets/top-bar-icon';

// Format large numbers (e.g., 1000000 -> "1M", 1250 -> "1.25K")
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return (
      (value / 1_000_000_000)
        .toFixed(value % 1_000_000_000 === 0 ? 0 : 2)
        .replace(/\.?0+$/, '') + 'B'
    );
  }
  if (value >= 1_000_000) {
    return (
      (value / 1_000_000)
        .toFixed(value % 1_000_000 === 0 ? 0 : 2)
        .replace(/\.?0+$/, '') + 'M'
    );
  }
  if (value >= 1_000) {
    return (
      (value / 1_000)
        .toFixed(value % 1_000 === 0 ? 0 : 2)
        .replace(/\.?0+$/, '') + 'K'
    );
  }
  return value.toString();
}

interface HeaderProps {
  onTabChange?: (tab: Tab) => void;
}

export default function Header({ onTabChange }: HeaderProps) {
  const { address } = useMinaAppkit();
  const {
    setIsInventoryModalOpen,
    setIsCraftModalOpen,
    setIsExpeditionModalOpen,
  } = useMiscellaneousSessionStore();
  const { gold, blackOrb, loadCurrencies } = useInventoryStore();

  useEffect(() => {
    if (address) {
      loadCurrencies(address);
    }
  }, [address, loadCurrencies]);

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
        <div className="ml-10 flex w-full items-center justify-between gap-2 px-0">
          <Button
            variant="gray"
            className="h-15 w-45 flex items-center justify-center gap-2.5"
          >
            <Image
              src={'/icons/gold-coin.png'}
              width={32}
              height={32}
              unoptimized={true}
              alt="gold-coin"
              quality={100}
              className="h-8 w-10"
            />
            <span>{formatCurrency(gold)}</span>
          </Button>
          {/* <Button
            variant="gray"
            className="h-15 flex w-32 items-center justify-center gap-2.5"
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
            <span>{formatCurrency(blackOrb)}</span>
          </Button> */}
          <div className="w-80 shrink-0">
            <Wallet />
          </div>
          {/* <div className="w-40 shrink-0">
            <WalletReown />
          </div> */}
        </div>
      </div>
    </>
  );
}
