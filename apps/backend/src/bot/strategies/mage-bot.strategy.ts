import { IPublicState } from '../../../../common/types/matchmaking.types';
import { IUserAction } from '../../../../common/types/gameplay.types';
import { Wizard, allWizards, WizardId } from '../../../../common/wizards';
import { allSpells } from '../../../../common/stater/spells';
import { BaseBotStrategy } from './base-bot.strategy';

/**
 * @title Mage Bot Strategy
 * @notice Bot strategy for the Mage wizard.
 * @dev Action pattern: reposition with a movement ally spell first, then cast
 *      a random enemy spell. Uses generic ally/enemy split — no hardcoded IDs.
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

    const { allySpells, enemySpells } = this.splitSpells(available);
    const actions: IUserAction[] = [];

    // 1st action: prefer a movement ally spell (Teleport) for repositioning.
    // Falls back to any available ally spell if Teleport is on cooldown.
    const moveSpell = allySpells.find((s) => {
      const def = allSpells.find((d) => d.id.toString() === s.spellId.toString());
      return def?.name === 'Teleport';
    }) ?? allySpells[0];

    if (moveSpell) {
      actions.push(
        this.buildSpellAction(botId, moveSpell.spellId.toString(), opponentState, undefined, currentState)
      );
    }

    // 2nd action: random enemy spell
    if (enemySpells.length > 0) {
      const pick = enemySpells[Math.floor(Math.random() * enemySpells.length)]!;
      actions.push(
        this.buildSpellAction(botId, pick.spellId.toString(), opponentState, undefined, currentState)
      );
    }

    return actions;
  }
}
