export const LEVELS_XP = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170,
  180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320,
  330, 340, 350, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470,
  480, 490, 500, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620,
  630, 640, 650, 660, 670, 680, 690, 700, 710, 720, 730, 740, 750, 760, 770,
  780, 790, 800, 810, 820, 830, 840, 850, 860, 870, 880, 890, 900, 910, 920,
  930, 940, 950, 960, 970, 980, 990, 1000,
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
