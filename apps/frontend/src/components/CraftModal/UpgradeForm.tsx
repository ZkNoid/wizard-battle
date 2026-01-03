import Image from 'next/image';
import { UpgradeFieldBg } from './assets/upgrade-field-bg';
import { Button } from '../shared/Button';

export function UpgradeForm() {
  const upgradeChance = 48;
  const cost = 1234;

  const steps: Array<{ title: string }> = [
    {
      title: '1. Place your gear',
    },
    {
      title: '2. Place crafting materials mentioned on gear for improvement',
    },
    {
      title: '3. To increase your % of crafting success add soul gem',
    },
    {
      title: '4. Click “craft”',
    },
  ];

  const buttonClassName =
    'flex h-16 w-auto flex-row items-center gap-2.5 px-6 transition-al -mt-4';

  return (
    <div className="relative flex h-full flex-col">
      {/* Content */}
      <div className="relative flex h-full w-full flex-col gap-5">
        {/* Content */}
        <div className="text-main-gray font-pixel flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-col gap-2.5">
            {/* Upgrade content goes here */}
            <div className="relative h-[470px] w-full bg-[#ACB0BC]">
              {/* Background overlay */}
              <UpgradeFieldBg className="absolute inset-0 z-10 h-full w-full" />

              {/* Inner content */}
              <div className="relative z-20 flex size-10 w-full items-center justify-center">
                Upgrade chance: {upgradeChance}%
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex w-full items-center justify-between">
                <span>Upgrade gear</span>
                <span className="flex items-center gap-1">
                  <span>Cost: {cost}</span>
                  <Image
                    src="/icons/gold-coin.png"
                    width={16}
                    height={16}
                    alt="gold-coin"
                    className="size-4 object-contain object-center"
                  />
                </span>
              </div>
              {steps.map((step) => (
                <div className="flex w-full items-center justify-between">
                  <span>{step.title}</span>
                </div>
              ))}
              <div>
                <span className="text-main-gray text-xs">
                  If the forging fails, you lose your money and soul gems
                </span>
              </div>
            </div>
            <div className="flex w-full justify-between">
              <div>
                <Button variant="red" className={buttonClassName}>
                  <span className="text-white">Cancel</span>
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="gray" className={buttonClassName}>
                  Clear
                </Button>
                <Button variant="green" className={buttonClassName}>
                  Craft
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
