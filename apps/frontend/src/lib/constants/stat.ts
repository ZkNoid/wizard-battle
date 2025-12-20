import type { IHeroStatConfig, IHeroStats } from "../types/IHeroStat";

export const heroStatsConfig: IHeroStatConfig[] = [
  {
    id: 'hp',
    icon: '/inventory/stats/hp.png',
    label: 'Hp',
    alt: 'hp',
  },
  {
    id: 'atk',
    icon: '/inventory/stats/attack.png',
    label: 'Atk',
    alt: 'attack',
  },
  {
    id: 'def',
    icon: '/inventory/stats/defence.png',
    label: 'Def',
    alt: 'defence',
  },
  {
    id: 'crit',
    icon: '/inventory/stats/crit.png',
    label: 'Crit',
    alt: 'crit',
  },
  {
    id: 'dodge',
    icon: '/inventory/stats/dodge.png',
    label: 'Dodge',
    alt: 'dodge',
  },
  {
    id: 'accuracy',
    icon: '/inventory/stats/accuracy.png',
    label: 'Acc',
    alt: 'accuracy',
  },
];

export const defaultHeroStats: IHeroStats = {
  hp: 100,
  atk: 10,
  def: 10,
  crit: 10,
  dodge: 10,
  accuracy: 10,
};