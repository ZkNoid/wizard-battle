export type HeroStatKey = 'hp' | 'atk' | 'def' | 'crit' | 'dodge' | 'accuracy';

export interface IHeroStats {
  hp: number;
  atk: number;
  def: number;
  crit: number;
  dodge: number;
  accuracy: number;
}

export interface IHeroStatConfig {
  id: HeroStatKey;
  icon: string;
  label: string;
  alt: string;
}

export type HeroStatValue = number;
