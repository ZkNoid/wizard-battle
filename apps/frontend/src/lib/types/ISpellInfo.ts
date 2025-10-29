export enum SpellTag {
  Support = 'Support',
  Self = 'Self',
  Projectile = 'Projectile',
  Summon = 'Summon',
  Melee = 'Melee',
  Opponent = 'Opponent',
}

export interface ISpellInfo {
  image: string;
  title: string;
  description: string;
  cooldown: number;
  tags: SpellTag[];
}
