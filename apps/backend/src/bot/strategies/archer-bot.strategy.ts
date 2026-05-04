import { IPublicState } from '../../../../common/types/matchmaking.types';
import { IUserAction } from '../../../../common/types/gameplay.types';
import { Wizard, allWizards, WizardId } from '../../../../common/wizards';
import { BaseBotStrategy } from './base-bot.strategy';

/**
 * @title Archer Bot Strategy
 * @notice Bot strategy for the Archer wizard.
 * @dev Action pattern: pick up to 2 random spells from whatever is available,
 *      no forced teleport — Archer relies on range rather than repositioning.
 */
export class ArcherBotStrategy extends BaseBotStrategy {
  protected getWizard(): Wizard {
    const wizard = allWizards.find(
      (w) => w.id.toString() === WizardId.ARCHER.toString()
    );
    if (!wizard) throw new Error('Archer wizard not found');
    return wizard;
  }

  protected pickActions(
    botId: string,
    currentState: IPublicState,
    opponentState?: IPublicState
  ): IUserAction[] {
    const available = this.getAvailableSpells(currentState);
    if (available.length === 0) return [];

    const actions: IUserAction[] = [];
    const pool = [...available];

    // Pick up to 2 random spells; no ordering preference
    for (let i = 0; i < 2 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const spell = pool.splice(idx, 1)[0]!;
      actions.push(
        this.buildSpellAction(botId, spell.spellId.toString(), opponentState, undefined, currentState)
      );
    }

    return actions;
  }
}
