import { IPublicState } from '../../../../common/types/matchmaking.types';
import { IUserAction } from '../../../../common/types/gameplay.types';
import { Wizard, allWizards, WizardId } from '../../../../common/wizards';
import { BaseBotStrategy } from './base-bot.strategy';

/**
 * @title Mage Bot Strategy
 * @notice Bot strategy for the Mage wizard.
 * @dev Action pattern: always teleport first (reposition), then cast a random
 *      non-teleport spell (attack or heal).
 */
export class MageBotStrategy extends BaseBotStrategy {
  protected getWizard(): Wizard {
    const wizard = allWizards.find(
      (w) => w.id.toString() === WizardId.MAGE.toString()
    );
    if (!wizard) throw new Error('Mage wizard not found');
    return wizard;
  }

  protected pickActions(
    botId: string,
    currentState: IPublicState,
    opponentState?: IPublicState
  ): IUserAction[] {
    const available = this.getAvailableSpells(currentState);
    if (available.length === 0) return [];

    const { TELEPORT_ID } = this.resolveSpellIds();
    const actions: IUserAction[] = [];

    // 1st action: teleport to reposition before attacking
    const teleport = available.find(
      (s) => s.spellId.toString() === TELEPORT_ID
    );
    if (teleport) {
      actions.push(
        this.buildSpellAction(botId, teleport.spellId.toString(), opponentState)
      );
    }

    // 2nd action: random spell excluding teleport
    const others = available.filter(
      (s) => s.spellId.toString() !== TELEPORT_ID
    );
    if (others.length > 0) {
      const pick = others[Math.floor(Math.random() * others.length)]!;
      actions.push(
        this.buildSpellAction(botId, pick.spellId.toString(), opponentState)
      );
    }

    return actions;
  }
}
