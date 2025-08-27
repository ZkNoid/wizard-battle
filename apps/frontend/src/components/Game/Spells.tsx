import { cn } from '@/lib/utils';
import { SpellsBg } from './assets/spells-bg';
import Image from 'next/image';
import type { SpellStats } from '../../../../common/stater/structs';
import type { ISpell } from '../../../../common/stater/spells/interface';
import { useInGameStore } from '@/lib/store/inGameStore';

export function Spells({
  skills,
  className,
}: {
  skills: ISpell<any>[];
  className?: string;
}) {
  const { setPickedSpellId } = useInGameStore();

  const MAX_SKILLS = 7;
  return (
    <div className={cn('w-217 h-32.5 relative flex flex-col', className)}>
      {/* Skills */}
      <div className={'px-15 flex flex-row gap-5 py-5'}>
        {skills.map((skill) => (
          <Image
            key={skill.id.toString()}
            className={
              'w-22.5 h-22.5 cursor-pointer transition-transform duration-300 hover:scale-110'
            }
            src={skill.image ?? ''}
            alt={'skill'}
            width={90}
            height={90}
            onClick={() => {
              console.log('Picked spell', skill.id.toString());
              setPickedSpellId(skill.id);
            }}
          />
        ))}
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
