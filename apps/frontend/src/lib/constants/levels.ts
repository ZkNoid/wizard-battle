export const LEVELS_XP = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400,
  1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700,
  2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000,
  4100, 4200, 4300, 4400, 4500, 4600, 4700, 4800, 4900, 5000, 5100, 5200, 5300,
  5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200, 6300, 6400, 6500, 6600,
  6700, 6800, 6900, 7000, 7100, 7200, 7300, 7400, 7500, 7600, 7700, 7800, 7900,
  8000, 8100, 8200, 8300, 8400, 8500, 8600, 8700, 8800, 8900, 9000, 9100, 9200,
  9300, 9400, 9500, 9600, 9700, 9800, 9900, 10000,
];

export const WIN_XP = 5;
export const LOSE_XP = 2;

/**
 * Converts XP to level.
 * @param xp - The amount of XP
 * @returns The level corresponding to the XP
 */
export const levelFromXp = (xp: number) => {
  // If XP is less than the minimum, return level 1
  if (LEVELS_XP.length === 0 || xp < LEVELS_XP[0]!) return 1;
  // Find the highest level for which XP is enough
  for (let i = LEVELS_XP.length - 1; i >= 0; i--) {
    if (LEVELS_XP[i]! <= xp) {
      return i + 1;
    }
  }
  return 1;
};

/**
 * Converts XP to the amount of XP needed to reach the next level.
 * @param xp - The amount of XP
 * @returns The amount of XP needed to reach the next level
 */
export const xpToNextLevel = (xp: number) => {
  const level = levelFromXp(xp);
  return LEVELS_XP[level]! - xp;
};

/**
 * Converts level to the required amount of XP for that level.
 * @param level - The level
 * @returns The XP required to reach the level
 */
export const levelToXp = (level: number) => {
  if (level <= 1) return LEVELS_XP[0]!;
  if (level > LEVELS_XP.length) return LEVELS_XP[LEVELS_XP.length - 1]!;
  return LEVELS_XP[level - 1]!;
};
