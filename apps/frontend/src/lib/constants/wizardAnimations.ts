import { WizardId } from '../../../../common/wizards';
import type { SpriteAnimationData } from '../types/SpriteAnimationData';

export const HERO_BACKGROUND: SpriteAnimationData = {
  sheetUrl: '/animations/heroes/Charaacter_Animation-sheet.png',
  frameCount: 11,
  frameWidth: 256,
  frameHeight: 320,
  frameDuration: 200,
};

export const WIZARD_ANIMATIONS: Partial<Record<string, SpriteAnimationData>> = {
  [WizardId.MAGE.toString()]: {
    sheetUrl: '/animations/heroes/Character_Mage.png',
    frameCount: 15,
    frameWidth: 320,
    frameHeight: 320,
    frameDuration: 200,
  },
  [WizardId.ARCHER.toString()]: {
    sheetUrl: '/animations/heroes/Character_Archer.png',
    frameCount: 15,
    frameWidth: 640,
    frameHeight: 640,
    frameDuration: 100,
  },
  [WizardId.PHANTOM_DUELIST.toString()]: {
    sheetUrl: '/animations/heroes/Character_Duelist.png',
    frameCount: 15,
    frameWidth: 320,
    frameHeight: 320,
    frameDuration: 100,
  },
};
