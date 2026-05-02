import { IPublicState } from '../../../../common/types/matchmaking.types';
import { IUserAction } from '../../../../common/types/gameplay.types';
import { Wizard, allWizards, WizardId } from '../../../../common/wizards';
import { BaseBotStrategy } from './base-bot.strategy';

const LOW_HP_THRESHOLD = 60;

/**
 * @title Phantom Duelist Bot Strategy
 * @notice Bot strategy for the Phantom Duelist wizard.
 * @dev Action pattern: heal first when HP is low, otherwise attack.
 *      High defense allows tanking hits, so no teleport priority.
 */
export class PhantomDuelistBotStrategy extends BaseBotStrategy {
  protected getWizard(): Wizard {
    const wizard = allWizards.find(
      (w) => w.id.toString() === WizardId.PHANTOM_DUELIST.toString()
    );
    if (!wizard) throw new Error('PhantomDuelist wizard not found');
    return wizard;
  }

  protected pickActions(
    botId: string,
    currentState: IPublicState,
    opponentState?: IPublicState
  ): IUserAction[] {
    const available = this.getAvailableSpells(currentState);
    if (available.length === 0) return [];

    const { HEAL_ID } = this.resolveSpellIds();
    const actions: IUserAction[] = [];

    // Read current HP to decide whether to prioritise healing
    let currentHP = 100;
    try {
      const parsed = JSON.parse(currentState.fields);
      currentHP = parseInt(parsed?.playerStats?.hp?.magnitude ?? '100');
    } catch { /* use default */ }

    const healSpell = available.find((s) => s.spellId.toString() === HEAL_ID);
    const attackSpells = available.filter((s) => s.spellId.toString() !== HEAL_ID);

    if (currentHP <= LOW_HP_THRESHOLD && healSpell) {
      // Prioritise heal when low on HP
      actions.push(
        this.buildSpellAction(botId, healSpell.spellId.toString(), opponentState)
      );
    }

    // Fill remaining slot(s) with a random attack spell
    if (actions.length < 2 && attackSpells.length > 0) {
      const pick =
        attackSpells[Math.floor(Math.random() * attackSpells.length)]!;
      actions.push(
        this.buildSpellAction(botId, pick.spellId.toString(), opponentState)
      );
    }

    return actions;
  }
}
