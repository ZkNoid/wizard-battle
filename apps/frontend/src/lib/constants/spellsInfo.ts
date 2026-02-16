import { SpellTag, type ISpellInfo } from '../types/ISpellInfo';

const mageSpells = [
  {
    image: '/wizards/skills/lightning.png',
    title: 'Lightning',
    description: 'Deal 80 damage to a small area.',
    cooldown: 1,
    tags: [SpellTag.Summon, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/fireball.png',
    title: 'FireBall',
    description: 'A ball of fire. Deals damage to a single target',
    cooldown: 2,
    tags: [SpellTag.Projectile, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/teleport.png',
    title: 'Teleport',
    description: 'Teleport to another tile on the map.',
    cooldown: 4,
    tags: [SpellTag.Support, SpellTag.Self],
  },
  {
    image: '/wizards/skills/heal.png',
    title: 'Heal',
    description: 'Heal for 50 HP.',
    cooldown: 3,
    tags: [SpellTag.Support, SpellTag.Self],
  },
  {
    image: '/wizards/skills/laser.png',
    title: 'Laser',
    description: 'Deal 50 damage to all tiles vertical and horizontal.',
    cooldown: 2,
    tags: [SpellTag.Summon, SpellTag.Opponent],
  },
];

const archerSpells = [
  {
    image: '/wizards/skills/arrow.png',
    title: 'Arrow',
    description:
      'Deal 50 damage. 30% chance to apply bleed for 60 damage over 3 turns.',
    cooldown: 1,
    tags: [SpellTag.Projectile, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/aimingShot.png',
    title: 'AimingShot',
    description: 'Deal 100 damage with +20% Crit. Chance.',
    cooldown: 2,
    tags: [SpellTag.Projectile, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/hailOfArrows.png',
    title: 'HailOfArrows',
    description: 'Deal 50 damage to an area. 20% to apply Slow for 2 turns.',
    cooldown: 3,
    tags: [SpellTag.Summon, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/decoy.png',
    title: 'Decoy',
    description:
      'Deploy a decoy and go invisible for 1 turn. If opponent strikes the decoy, deal 60 damage over 2 turns.',
    cooldown: 3,
    tags: [SpellTag.Support, SpellTag.Self],
  },
  {
    image: '/wizards/skills/smokeCloud.png',
    title: 'Cloud',
    description:
      'Create a large smoke cloud for 2 turns. Archer is invisible while within.',
    cooldown: 3,
    tags: [SpellTag.Support, SpellTag.Self],
  },
];

const phantomDuelistSpells = [
  {
    image: '/wizards/skills/spectralArrow.png',
    title: 'SpectralArrow',
    description: 'Deal 50 damage to a single target.',
    cooldown: 1,
    tags: [SpellTag.Projectile, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/shadowVeil.png',
    title: 'ShadowVeil',
    description:
      'Become invisible for 2 turns. Next attack deals +50% damage and reveals you.',
    cooldown: 5,
    tags: [SpellTag.Support, SpellTag.Self],
  },
  {
    image: '/wizards/skills/spectralProjection.png',
    title: 'SpectralProjection',
    description:
      "Create a spectral projection on opponent's field for 3 turns, transforming skills into melee variants.",
    cooldown: 6,
    tags: [SpellTag.Summon, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/duskEmbrace.png',
    title: 'DusksEmbrace',
    description:
      'Deal 50 damage to a horizontal line and apply Weaken (-30% Defence) for 2 turns if hit.',
    cooldown: 2,
    tags: [SpellTag.Summon, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/phantomEcho.png',
    title: 'PhantomEcho',
    description:
      'Deal 30 damage to a diamond 3x3 area. If hit, opponent becomes visible and takes +50% damage for 1 turn.',
    cooldown: 3,
    tags: [SpellTag.Summon, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/shadowStrike.png',
    title: 'ShadowStrike',
    description: 'Deal 50 damage with +20% critical chance. (Spectral Form)',
    cooldown: 1,
    tags: [SpellTag.Projectile, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/shadowDash.png',
    title: 'ShadowDash',
    description: 'Dash to a tile and deal 50 damage to all tiles in a line.',
    cooldown: 2,
    tags: [SpellTag.Summon, SpellTag.Opponent],
  },
  {
    image: '/wizards/skills/whirlingBlades.png',
    title: 'WhirlingBlades',
    description: 'Deal 50 damage to an area. 20% to apply Slow for 2 turns.',
    cooldown: 3,
    tags: [SpellTag.Summon, SpellTag.Opponent],
  },
];

export const SPELLS_INFO: ISpellInfo[] = [
  ...mageSpells,
  ...archerSpells,
  ...phantomDuelistSpells,
];
