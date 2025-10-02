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

  const MAX_SKILLS = 7;
  return (
    <div className={cn('w-217 h-32.5 relative flex flex-col', className)}>
      {/* Skills */}
      <div className={'px-15 flex flex-row gap-5 py-5'}>
        {skills.map((skill) =>
          +skill.currentCooldown === 0 ? (
            <Image
              key={skill.id.toString()}
              className={cn(
                'w-22.5 h-22.5 cursor-pointer transition-transform duration-300 hover:scale-110',
                pickedSpellId === skill.id &&
                  'ring-2 ring-blue-500 ring-offset-2'
              )}
              src={skill.image ?? ''}
              alt={'skill'}
              width={90}
              height={90}
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
          ) : (
            <div key={skill.id.toString()} className="w-22.5 h-22.5 relative">
              <Image
                className={cn(
                  'w-22.5 h-22.5 cursor-pointer opacity-60 grayscale transition-transform duration-300 hover:scale-110',
                  pickedSpellId === skill.id &&
                    'ring-2 ring-blue-500 ring-offset-2'
                )}
                src={skill.image ?? ''}
                alt={'skill'}
                width={90}
                height={90}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {skill.currentCooldown.toString()}
                </span>
              </div>
            </div>
          )
        )}
        {/* Empty skills */}
        {Array.from({ length: MAX_SKILLS - skills.length }).map((_, index) => (
          <Image
            key={index}
            className="w-22.5 h-22.5"
            src={'/wizards/skills/empty.svg'}
            alt={'empty skill'}
            width={90}
            height={90}
          />
        ))}
      </div>
      <SpellsBg className="w-217 h-32.5 absolute left-0 top-0 -z-[1]" />
    </div>
  );
}
