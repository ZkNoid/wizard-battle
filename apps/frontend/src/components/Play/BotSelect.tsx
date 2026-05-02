import { Button } from '../shared/Button';
import { ModeBg } from './assets/mode-bg';
import { PlaySteps } from '@/lib/enums/PlaySteps';
import { BotType } from '@/lib/enums/BotType';

const MageBotIcon = ({ className }: { className?: string }) => (
  <svg
    width="120"
    height="120"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Hat */}
    <rect x="50" y="5" width="20" height="5" fill="#5376CC" />
    <rect x="45" y="10" width="30" height="5" fill="#5376CC" />
    <rect x="40" y="15" width="40" height="5" fill="#365BB6" />
    <rect x="35" y="20" width="50" height="5" fill="#5376CC" />
    <rect x="30" y="25" width="60" height="5" fill="#5376CC" />
    {/* Hat brim */}
    <rect x="25" y="30" width="70" height="5" fill="#365BB6" />
    {/* Face */}
    <rect x="35" y="35" width="50" height="30" fill="#DDE4F5" />
    {/* Eyes */}
    <rect x="42" y="45" width="8" height="8" fill="#1F3467" />
    <rect x="70" y="45" width="8" height="8" fill="#1F3467" />
    {/* Eye shine */}
    <rect x="44" y="47" width="3" height="3" fill="#C9D4EF" />
    <rect x="72" y="47" width="3" height="3" fill="#C9D4EF" />
    {/* Mouth */}
    <rect x="47" y="58" width="26" height="4" fill="#A2B5E3" />
    {/* Robe */}
    <rect x="30" y="65" width="60" height="40" fill="#5376CC" />
    <rect x="25" y="70" width="70" height="30" fill="#365BB6" />
    {/* Robe detail */}
    <rect x="55" y="65" width="10" height="35" fill="#A2B5E3" />
    {/* Hands */}
    <rect x="15" y="70" width="15" height="10" fill="#DDE4F5" />
    <rect x="90" y="70" width="15" height="10" fill="#DDE4F5" />
    {/* Staff */}
    <rect x="100" y="20" width="5" height="60" fill="#1F3467" />
    <rect x="95" y="15" width="15" height="5" fill="#FFDF7C" />
    <rect x="97" y="10" width="11" height="5" fill="#FFB047" />
    <rect x="100" y="5" width="5" height="5" fill="#DE3607" />
    {/* Feet */}
    <rect x="35" y="105" width="20" height="10" fill="#1F3467" />
    <rect x="65" y="105" width="20" height="10" fill="#1F3467" />
  </svg>
);

const ArcherBotIcon = ({ className }: { className?: string }) => (
  <svg
    width="120"
    height="120"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Hood */}
    <rect x="40" y="5" width="40" height="10" fill="#365BB6" />
    <rect x="35" y="15" width="50" height="5" fill="#365BB6" />
    {/* Face */}
    <rect x="35" y="20" width="50" height="30" fill="#DDE4F5" />
    {/* Eyes */}
    <rect x="42" y="30" width="8" height="8" fill="#1F3467" />
    <rect x="70" y="30" width="8" height="8" fill="#1F3467" />
    <rect x="44" y="32" width="3" height="3" fill="#C9D4EF" />
    <rect x="72" y="32" width="3" height="3" fill="#C9D4EF" />
    {/* Mouth */}
    <rect x="47" y="42" width="26" height="4" fill="#A2B5E3" />
    {/* Scarf */}
    <rect x="30" y="50" width="60" height="8" fill="#5376CC" />
    {/* Body/Armor */}
    <rect x="32" y="58" width="56" height="40" fill="#A2B5E3" />
    <rect x="38" y="62" width="44" height="32" fill="#C9D4EF" />
    {/* Armor detail */}
    <rect x="55" y="58" width="10" height="40" fill="#DDE4F5" />
    {/* Hands */}
    <rect x="12" y="62" width="20" height="8" fill="#DDE4F5" />
    <rect x="88" y="62" width="20" height="8" fill="#DDE4F5" />
    {/* Bow */}
    <rect x="5" y="20" width="5" height="60" fill="#B53004" />
    <rect x="5" y="20" width="5" height="5" fill="#DE3607" />
    <rect x="5" y="75" width="5" height="5" fill="#DE3607" />
    {/* Bowstring */}
    <rect x="8" y="25" width="3" height="50" fill="#FBFAFA" />
    {/* Arrow */}
    <rect x="20" y="47" width="65" height="3" fill="#FFB047" />
    <rect x="82" y="44" width="5" height="9" fill="#DE3607" />
    <rect x="20" y="45" width="5" height="5" fill="#B53004" />
    {/* Feet */}
    <rect x="35" y="98" width="20" height="10" fill="#1F3467" />
    <rect x="65" y="98" width="20" height="10" fill="#1F3467" />
  </svg>
);

const WarriorBotIcon = ({ className }: { className?: string }) => (
  <svg
    width="120"
    height="120"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Helmet */}
    <rect x="35" y="5" width="50" height="5" fill="#A2B5E3" />
    <rect x="30" y="10" width="60" height="5" fill="#C9D4EF" />
    <rect x="30" y="15" width="60" height="5" fill="#A2B5E3" />
    {/* Helmet visor */}
    <rect x="30" y="20" width="60" height="5" fill="#365BB6" />
    <rect x="35" y="25" width="50" height="5" fill="#365BB6" />
    {/* Face slit */}
    <rect x="38" y="28" width="14" height="5" fill="#070C19" />
    <rect x="68" y="28" width="14" height="5" fill="#070C19" />
    {/* Chin guard */}
    <rect x="33" y="33" width="54" height="5" fill="#A2B5E3" />
    {/* Armor body */}
    <rect x="25" y="38" width="70" height="50" fill="#C9D4EF" />
    <rect x="30" y="42" width="60" height="42" fill="#DDE4F5" />
    {/* Chest plate */}
    <rect x="42" y="45" width="36" height="30" fill="#A2B5E3" />
    <rect x="57" y="38" width="6" height="50" fill="#C9D4EF" />
    {/* Pauldrons */}
    <rect x="15" y="38" width="15" height="15" fill="#A2B5E3" />
    <rect x="90" y="38" width="15" height="15" fill="#A2B5E3" />
    {/* Shield */}
    <rect x="90" y="53" width="20" height="35" fill="#5376CC" />
    <rect x="93" y="56" width="14" height="29" fill="#365BB6" />
    <rect x="98" y="60" width="4" height="20" fill="#A2B5E3" />
    {/* Sword */}
    <rect x="8" y="15" width="5" height="55" fill="#C9D4EF" />
    <rect x="5" y="15" width="11" height="5" fill="#FFB047" />
    <rect x="9" y="10" width="3" height="5" fill="#FFDF7C" />
    {/* Feet */}
    <rect x="32" y="88" width="22" height="12" fill="#A2B5E3" />
    <rect x="66" y="88" width="22" height="12" fill="#A2B5E3" />
    <rect x="30" y="98" width="26" height="5" fill="#C9D4EF" />
    <rect x="64" y="98" width="26" height="5" fill="#C9D4EF" />
  </svg>
);

const BOT_OPTIONS = [
  {
    type: BotType.MAGE,
    label: 'Mage',
    description:
      'A powerful spellcaster who teleports across the battlefield and unleashes devastating arcane attacks.',
    icon: MageBotIcon,
  },
  {
    type: BotType.ARCHER,
    label: 'Archer',
    description:
      'A swift ranged fighter who strikes from afar with precise arrow shots and unpredictable spell combinations.',
    icon: ArcherBotIcon,
  },
  {
    type: BotType.WARRIOR,
    label: 'Warrior',
    description:
      'A cunning duelist who uses stealth and defensive buffs to outlast opponents before landing decisive blows.',
    icon: WarriorBotIcon,
  },
] as const;

export function BotSelect({
  setPlayStep,
  setBotType,
}: {
  setPlayStep: (playStep: PlaySteps) => void;
  setBotType: (botType: BotType) => void;
}) {
  return (
    <div className="flex items-center gap-5">
      {BOT_OPTIONS.map(({ type, label, description, icon: Icon }) => (
        <div
          key={type}
          className="px-15 py-13.5 w-143 h-143 relative flex flex-col items-center"
        >
          <Icon className="w-30 h-30 mt-4" />
          <span className="font-pixel text-main-gray mt-5 text-3xl">
            {label}
          </span>
          <span className="font-pixel-klein text-main-gray mt-4 text-center text-xl leading-6">
            {description}
          </span>
          <div className="mt-auto flex w-full items-center justify-center">
            <Button
              variant="gray"
              className="w-106 h-15"
              onClick={() => {
                setBotType(type);
                setPlayStep(PlaySteps.SELECT_MAP);
              }}
              enableHoverSound
              enableClickSound
              isLong={true}
            >
              Select
            </Button>
          </div>
          <ModeBg className="absolute left-0 top-0 -z-[1] h-full w-full" />
        </div>
      ))}
    </div>
  );
}
