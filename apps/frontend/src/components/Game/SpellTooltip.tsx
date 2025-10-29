import { Tooltip, TooltipContent, TooltipTrigger } from '../shared/Tooltip';
import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ISpellInfo } from '@/lib/types/ISpellInfo';
import { SpellTag } from '@/lib/types/ISpellInfo';

export function SpellTooltip({
  spellInfo,
  children,
}: {
  spellInfo: ISpellInfo;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="flex min-w-40 flex-col gap-1 p-2">
        <div className="flex flex-row gap-2.5">
          <Image
            src={spellInfo.image}
            alt={spellInfo.title}
            width={300}
            height={300}
            className="size-10 object-contain object-center"
            unoptimized={true}
            quality={100}
          />
          <div className="flex flex-col gap-1">
            <span className="font-pixel text-main-gray text-sm font-bold">
              {spellInfo.title}
            </span>
            <div className="flex flex-row items-center gap-1">
              {spellInfo.tags.map((tag, index) => (
                <span
                  key={index}
                  className={cn(
                    'font-pixel text-main-gray text-xs',
                    tag === SpellTag.Support
                      ? 'text-[#00AF06]'
                      : tag === SpellTag.Self
                        ? 'text-[#00AF06]'
                        : tag === SpellTag.Projectile
                          ? 'text-[#0035B7]'
                          : tag === SpellTag.Summon
                            ? 'text-[#5E00E1]'
                            : tag === SpellTag.Melee
                              ? 'text-[#D42A00]'
                              : 'text-[#D42A00]'
                  )}
                >
                  [{tag}]
                </span>
              ))}
            </div>
          </div>
        </div>
        <span className="font-pixel text-main-gray mt-1 max-w-60 text-wrap break-words text-xs">
          {spellInfo.description}
        </span>
        <div className="my-1 h-px w-full bg-black" />
        <div className="flex w-full flex-row items-center gap-1">
          <Image
            src="/icons/cooldown-clock.png"
            alt="cooldown"
            width={16}
            height={16}
            className="size-5 object-contain object-center"
          />
          <span className="font-pixel text-main-gray text-xs">
            Cooldown: {spellInfo.cooldown} turns
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
