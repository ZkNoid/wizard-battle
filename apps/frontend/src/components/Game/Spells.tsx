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
          <Image
            key={skill.id.toString()}
            className={cn(
              'size-16 cursor-pointer border-4 border-black transition-transform duration-300 hover:scale-110',
              pickedSpellId === skill.id && 'ring-2 ring-blue-500 ring-offset-2'
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
