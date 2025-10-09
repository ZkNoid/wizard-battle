import { cn } from '@/lib/utils';
import { SpellsBg } from './assets/spells-bg';
import Image from 'next/image';
import type { SpellStats } from '../../../../common/stater/structs';
import type { ISpell } from '../../../../common/stater/spells/interface';
import { useInGameStore } from '@/lib/store/inGameStore';
import { EventBus } from '@/game/EventBus';
import type { Int64 } from 'o1js';

export function Spells({
  skills,
  className,
}: {
  skills: (ISpell<any> & { currentCooldown: Int64 })[];
  className?: string;
}) {
  const { pickedSpellId, setPickedSpellId } = useInGameStore();

  const MAX_SKILLS = 10;
  return (
    <div className="relative z-[1] ml-6 flex h-full w-full flex-row items-center justify-center gap-2.5">
      <>
        {skills.map((skill) => (
          <button
            key={skill.id.toString()}
            disabled={+skill.currentCooldown === 0}
            className={
              'not-disabled:cursor-pointer not-disabled:transition-transform not-disabled:duration-300 not-disabled:hover:scale-110 group relative size-16 disabled:cursor-not-allowed'
            }
          >
            <Image
              className={cn(
                'size-full border-4 border-black',
                pickedSpellId === skill.id &&
                  'ring-2 ring-blue-500 ring-offset-2'
              )}
              src={skill.image ?? ''}
              alt={'skill'}
              width={64}
              height={64}
              onClick={() => {
                console.log('Picked spell', skill.id.toString());

                if (pickedSpellId?.toString() === skill.id.toString()) {
                  EventBus.emit('pick-spell', null);
                  setPickedSpellId(null);
                } else {
                  EventBus.emit('pick-spell', skill);
                  setPickedSpellId(skill.id);
                }
              }}
            />
            <div className="invisible absolute inset-0 z-0 flex size-full items-center justify-center border-4 border-black backdrop-blur-[2px] group-disabled:visible">
              <span className="font-pixel text-main-gray text-lg">
                {skill.currentCooldown.toString()}
              </span>
            </div>
          </button>
        ))}
        {Array.from({ length: MAX_SKILLS - skills.length }).map((_, index) => (
          <Image
            key={index}
            className="size-16 cursor-not-allowed border-4 border-black"
            src={'/wizards/skills/empty.png'}
            alt={'empty skill'}
            width={64}
            height={64}
          />
        ))}
      </>
    </div>
  );
}
